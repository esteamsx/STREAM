import { inflateRawSync } from "node:zlib";
import { readFile } from "node:fs/promises";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const STRING_POOL_CHUNK = 0x0001;
const START_ELEMENT_CHUNK = 0x0102;
const UTF8_FLAG = 0x00000100;
const ANDROID_PACKAGE_ID = "com.esteamstv.app";
const MAX_APK_SIZE = 128 * 1024 * 1024;
const MAX_MANIFEST_SIZE = 16 * 1024 * 1024;

function requireRange(buffer, offset, length, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`Invalid Android APK ${label}.`);
  }
}

function findZipEntry(apk, targetName) {
  const minOffset = Math.max(0, apk.length - 22 - 0xffff);
  let eocdOffset = -1;
  for (let offset = apk.length - 22; offset >= minOffset; offset--) {
    if (apk.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Android APK ZIP directory was not found.");
  requireRange(apk, eocdOffset, 22, "ZIP directory");

  const entryCount = apk.readUInt16LE(eocdOffset + 10);
  const directoryOffset = apk.readUInt32LE(eocdOffset + 16);
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    requireRange(apk, offset, 46, "ZIP entry");
    if (apk.readUInt32LE(offset) !== CENTRAL_FILE_SIGNATURE) throw new Error("Invalid Android APK ZIP entry.");

    const compression = apk.readUInt16LE(offset + 10);
    const compressedSize = apk.readUInt32LE(offset + 20);
    const nameLength = apk.readUInt16LE(offset + 28);
    const extraLength = apk.readUInt16LE(offset + 30);
    const commentLength = apk.readUInt16LE(offset + 32);
    const localOffset = apk.readUInt32LE(offset + 42);
    requireRange(apk, offset + 46, nameLength + extraLength + commentLength, "ZIP entry name");
    const name = apk.toString("utf8", offset + 46, offset + 46 + nameLength);

    if (name === targetName) {
      requireRange(apk, localOffset, 30, "local ZIP entry");
      if (apk.readUInt32LE(localOffset) !== LOCAL_FILE_SIGNATURE) throw new Error("Invalid Android APK manifest entry.");
      const localNameLength = apk.readUInt16LE(localOffset + 26);
      const localExtraLength = apk.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      requireRange(apk, dataOffset, compressedSize, "manifest data");
      const compressed = apk.subarray(dataOffset, dataOffset + compressedSize);
      let contents;
      if (compression === 0) contents = Buffer.from(compressed);
      else if (compression === 8) contents = inflateRawSync(compressed, { maxOutputLength: MAX_MANIFEST_SIZE });
      else throw new Error("Unsupported compression for the Android APK manifest.");
      if (contents.length > MAX_MANIFEST_SIZE) throw new Error("Android APK manifest is too large.");
      return contents;
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("Android APK manifest was not found.");
}

function readLength8(buffer, offset) {
  requireRange(buffer, offset, 1, "UTF-8 string length");
  const first = buffer[offset++];
  if ((first & 0x80) === 0) return [first, offset];
  requireRange(buffer, offset, 1, "UTF-8 string length");
  return [((first & 0x7f) << 8) | buffer[offset], offset + 1];
}

function readLength16(buffer, offset) {
  requireRange(buffer, offset, 2, "UTF-16 string length");
  const first = buffer.readUInt16LE(offset);
  if ((first & 0x8000) === 0) return [first, offset + 2];
  requireRange(buffer, offset + 2, 2, "UTF-16 string length");
  return [((first & 0x7fff) << 16) | buffer.readUInt16LE(offset + 2), offset + 4];
}

function readStringPool(xml, chunkOffset, chunkHeaderSize, chunkSize) {
  requireRange(xml, chunkOffset, chunkSize, "string pool");
  requireRange(xml, chunkOffset, 28, "string pool header");
  const stringCount = xml.readUInt32LE(chunkOffset + 8);
  const flags = xml.readUInt32LE(chunkOffset + 16);
  const stringsStart = xml.readUInt32LE(chunkOffset + 20);
  const offsetsStart = chunkOffset + chunkHeaderSize;
  requireRange(xml, offsetsStart, stringCount * 4, "string pool offsets");
  const stringsBase = chunkOffset + stringsStart;
  const isUtf8 = (flags & UTF8_FLAG) !== 0;
  const strings = new Array(stringCount);

  for (let index = 0; index < stringCount; index++) {
    const stringOffset = xml.readUInt32LE(offsetsStart + index * 4);
    let cursor = stringsBase + stringOffset;
    let byteLength;
    if (isUtf8) {
      [, cursor] = readLength8(xml, cursor);
      [byteLength, cursor] = readLength8(xml, cursor);
      requireRange(xml, cursor, byteLength, "UTF-8 string");
      strings[index] = xml.toString("utf8", cursor, cursor + byteLength);
    } else {
      [byteLength, cursor] = readLength16(xml, cursor);
      const byteCount = byteLength * 2;
      requireRange(xml, cursor, byteCount, "UTF-16 string");
      strings[index] = xml.toString("utf16le", cursor, cursor + byteCount);
    }
  }
  return strings;
}

function parseManifestVersion(xml) {
  if (!Buffer.isBuffer(xml) || xml.length < 8) throw new Error("Android APK manifest is invalid.");
  let strings = [];
  let packageName = null;
  let versionName = null;
  let versionCode = null;

  for (let offset = 8; offset + 8 <= xml.length;) {
    const type = xml.readUInt16LE(offset);
    const headerSize = xml.readUInt16LE(offset + 2);
    const chunkSize = xml.readUInt32LE(offset + 4);
    if (headerSize < 8 || chunkSize < headerSize || offset + chunkSize > xml.length) {
      throw new Error("Android APK manifest contains an invalid XML chunk.");
    }

    if (type === STRING_POOL_CHUNK) {
      strings = readStringPool(xml, offset, headerSize, chunkSize);
    } else if (type === START_ELEMENT_CHUNK && headerSize >= 16 && chunkSize >= 36) {
      const elementNameIndex = xml.readUInt32LE(offset + 20);
      const elementName = strings[elementNameIndex];
      if (elementName === "manifest") {
        const attributeStart = xml.readUInt16LE(offset + 24);
        const attributeSize = xml.readUInt16LE(offset + 26);
        const attributeCount = xml.readUInt16LE(offset + 28);
        if (attributeSize < 20) throw new Error("Android APK manifest attributes are invalid.");
        const attributesOffset = offset + 16 + attributeStart;
        requireRange(xml, attributesOffset, attributeCount * attributeSize, "manifest attributes");

        for (let index = 0; index < attributeCount; index++) {
          const attributeOffset = attributesOffset + index * attributeSize;
          const nameIndex = xml.readUInt32LE(attributeOffset + 4);
          const rawValueIndex = xml.readUInt32LE(attributeOffset + 8);
          const valueType = xml.readUInt8(attributeOffset + 15);
          const valueData = xml.readUInt32LE(attributeOffset + 16);
          const attributeName = strings[nameIndex];
          const rawValue = rawValueIndex === 0xffffffff ? undefined : strings[rawValueIndex];
          const typedString = valueType === 0x03 ? strings[valueData] : undefined;
          const value = rawValue ?? typedString;

          if (attributeName === "package") packageName = value;
          if (attributeName === "versionName") versionName = value;
          if (attributeName === "versionCode" && valueType >= 0x10 && valueType <= 0x1f) versionCode = valueData;
        }
        break;
      }
    }
    offset += chunkSize;
  }

  if (packageName !== ANDROID_PACKAGE_ID) throw new Error("The website APK package ID does not match ES TEAMS TV.");
  if (!versionName || !/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/.test(versionName)) {
    throw new Error("The website APK does not contain a valid Android version name.");
  }
  return {
    packageName,
    version: versionName,
    versionCode: Number.isSafeInteger(versionCode) && versionCode > 0 ? versionCode : null,
  };
}

export function parseAndroidApkVersion(apk) {
  if (!Buffer.isBuffer(apk) || apk.length < 22 || apk.length > MAX_APK_SIZE) {
    throw new Error("The website APK is missing or has an invalid size.");
  }
  return parseManifestVersion(findZipEntry(apk, "AndroidManifest.xml"));
}

export async function readAndroidApkVersion(apkPath) {
  return parseAndroidApkVersion(await readFile(apkPath));
}

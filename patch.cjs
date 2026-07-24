const fs = require("fs");

const file = "api.js";
let s = fs.readFileSync(file, "utf8");

if (!s.includes(".wm-hitbox{")) {
  s = s.replace(
    /\.wm-name\{[^}]+\}/,
    m => m + `
  .wm-hitbox{
    position:absolute;
    top:50%;
    right:10px;
    transform:translateY(-50%);
    width:95px;
    height:18px;
    z-index:4;
    background:transparent;
    opacity:0;
  }`
  );
}

s = s.replace(
  '<video id="v" playsinline autoplay muted></video>',
  `<video id="v" playsinline autoplay muted></video>

  <a class="wm-hitbox"
     href="https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29"
     target="_blank"
     rel="noopener noreferrer"
     aria-label="WhatsApp Channel"></a>`
);

fs.writeFileSync(file, s);
console.log("✅ api.js patched successfully!");

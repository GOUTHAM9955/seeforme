// Shared theme, layouts and helpers for both decks.
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const SKILL = "/Users/gouthamkakani/.claude/skills/synced/43942528-7fcc-4b51-ba10-6b58ab83d433_7d511729-a20b-4ec5-b729-c9b13485dfe9/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const THEME = {
  name: "SeeForMe", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "111827", lt1: "FFFFFF", dk2: "0E1A45", lt2: "F4F6FB", accent1: "2446C8", accent2: "F2A900",
            accent3: "0B6A33", accent4: "8C2D00", accent5: "5D6A82", accent6: "8FB0FF", hlink: "2446C8", folHlink: "5D6A82" },
};
const HEX = THEME.colors;

function newDeck(title, footer) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";   // 10 x 5.625 in
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = title; pres.author = "SeeForMe team";
  const C = pres.SchemeColor;
  pres.defineSlideMaster({
    title: "TITLE_DARK", background: { color: C.text2 },
    placeholders: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.2, w: 5.8, h: 1.6, fontSize: 46, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.95, w: 5.6, h: 1.9, fontSize: 18, color: C.accent6, align: "left", valign: "top", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT", background: { color: C.background1 },
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 11, color: C.accent5, align: "right" },
    objects: [{ text: { text: footer, options: { x: 0.5, y: 5.2, w: 5, h: 0.3, fontSize: 11, color: C.accent5, margin: 0 } } }],
    placeholders: [
      { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.85, fontSize: 30, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    ],
  });

  const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.14 });
  async function icon(Comp, hex) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + hex, size: "256" }));
    const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return "image/png;base64," + png.toString("base64");
  }
  const H = {
    pres, C, fa, shadow,
    tbd(s, x, y, w, h, label, name) {
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.accent2, width: 2, dashType: "dash" }, objectName: name || "TBD box" });
      s.addText("TBD: " + label.replace(/^TBD:\s*/, ""), { x, y, w, h, isTextBox: true, fontSize: 14, italic: true, color: C.accent4, align: "center", valign: "middle", margin: 8, objectName: (name || "TBD") + " text" });
    },
    card(s, x, y, w, h, name) {
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: C.background2 }, line: { color: C.background2, width: 0.5 }, shadow: shadow(), objectName: name });
    },
    async iconCircle(s, Comp, x, y, d, fillColor, iconHex, name) {
      s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fillColor }, line: { color: fillColor, width: 0.5 }, objectName: name + " circle" });
      const pad = d * 0.25;
      s.addImage({ data: await icon(Comp, iconHex), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, altText: name, objectName: name + " icon" });
    },
    async logo(s) {
      s.addShape(pres.ShapeType.ellipse, { x: 6.7, y: 1.2, w: 2.7, h: 2.7, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0.5 }, objectName: "Logo circle" });
      s.addImage({ data: await icon(fa.FaEye, "FFFFFF"), x: 7.35, y: 1.85, w: 1.4, h: 1.4, altText: "Eye icon", objectName: "Logo eye" });
    },
    table(s, rows, opts) {   // rows: [[header...], [cell...]]  cells are strings; first col bold
      const head = rows[0].map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.dk2 }, fontSize: opts.fs || 13, valign: "middle", align: opts.center ? "center" : "left" } }));
      const body = rows.slice(1).map((r) => r.map((t, i) => ({ text: t, options: { fontSize: opts.fs || 13, valign: "middle", color: HEX.dk1, bold: i === 0, align: opts.center && i > 0 ? "center" : "left" } })));
      s.addTable([head, ...body], { x: opts.x, y: opts.y, w: opts.w, colW: opts.colW, rowH: opts.rowH, border: { type: "solid", color: "D3D9E6", pt: 1 }, fill: { color: "FFFFFF" }, objectName: opts.name });
    },
    async finish(fileName) {
      await pres.writeFile({ fileName });
      await applyTheme(fileName, THEME);
      console.log("wrote", fileName);
    },
  };
  return H;
}
module.exports = { newDeck, HEX, THEME };

// Slugs and the usted check, shared by the blog and the recipes.
export const slugify = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Spanish on the site is "usted" (STANDARDS §4). These words only appear when the text says "tú".
const TU_WORDS = new Set(("tú tu tus contigo te tuyo tuya tuyos tuyas vos eres estás tienes puedes quieres sabes haces vas " +
  "necesitas debes crees piensas sientes dices hablas buscas usas lees escribes vienes conoces encuentras quieras puedas tengas " +
  "seas estés hagas sepas").split(" "));
const TU_ENCLITIC = /^[a-zñ]*[áéíóú][a-zñ]{0,3}(ate|ete|ite|ame|eme)$/; // regístrate, suscríbete, cuéntame
const NOT_TU = new Set(["límite", "límites"]); // nouns that look like enclitics ("fechas límite")
export function checkUsted(text, where, fail) {
  const plain = String(text ?? "")
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, " ")     // code isn't translated
    .replace(/`[^`\n]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "]")                   // link targets
    .replace(/<[^>]+>/g, " ");                      // tags (attribute text like aria-label is checked below)
  const attrs = [...String(text ?? "").matchAll(/(?:aria-label|alt|title)="([^"]*)"/g)].map((m) => m[1]).join(" ");
  for (const w of words(`${plain} ${attrs}`)) {
    if (TU_WORDS.has(w) || (TU_ENCLITIC.test(w) && !NOT_TU.has(w))) fail(`${where}: "${w}" is the "tú" form; the Spanish uses "usted"`);
  }
}
export const words = (s) => String(s ?? "").toLowerCase().match(/[a-záéíóúñü]+/g) || [];

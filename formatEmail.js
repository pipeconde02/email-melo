import pkg from "quoted-printable";
import fs from "fs";

const { decode } = pkg;

// Cargar textos a omitir desde omitText.json
const omitTexts = JSON.parse(
  fs.readFileSync("./omitText.json", "utf8")
).textsToOmit;

// Función para eliminar URLs del texto
function removeURLs(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, "").trim();
}

function formatEmail(rawEmail) {
  // Paso 1: Dividir el contenido para aislar solo la parte que necesitamos
  const emailSections = rawEmail.split("------=_Part");
  const relevantSection = emailSections.find((section) =>
    section.includes("Content-Type: text/plain")
  );

  if (!relevantSection) {
    return "No se pudo encontrar el contenido del correo.";
  }

  // Paso 2: Extraer el contenido relevante eliminando metadatos
  const lines = relevantSection.split("\n");
  const contentLines = lines.filter(
    (line) =>
      !line.startsWith("Content-Type") &&
      !line.startsWith("Content-Transfer-Encoding") &&
      line.trim() !== ""
  );

  // Paso 3: Decodificar el texto si está codificado en quoted-printable
  const decodedContent = decode(contentLines.join("\n"));

  // Paso 4: Limpiar texto y quitar caracteres innecesarios
  let cleanContent = decodedContent
    .replace(/=C3=B3/g, "ó")
    .replace(/=C3=A9/g, "é")
    .replace(/=C3=AD/g, "í")
    .replace(/=C3=BA/g, "ú")
    .replace(/=C3=B1/g, "ñ")
    .replace(/=20/g, " ")
    .replace(/=C2=A0/g, " ")
    .replace(/=3D/g, "=")
    .replace(/Ã³/g, "ó")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Â/g, "")
    .replace(/\[.*?\]/g, "") // Eliminar texto entre corchetes (enlaces)
    .replace(/SRC:.*$/gm, "") // Eliminar línea con "SRC"
    .replace(/(\r\n|\r|\n){3,}/g, "\n\n") // Limitar múltiples saltos de línea a dos
    .replace(/(\r\n|\r|\n)/g, "\n") // Asegurar saltos de línea únicos
    .replace(/\s+$/gm, "") // Remover espacios extra al final de cada línea
    .trim();

  // Paso 5: Omitir textos definidos en omitText.json
  omitTexts.forEach((text) => {
    const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    cleanContent = cleanContent.replace(regex, "").trim();
  });

  // Paso 6: Eliminar URLs
  cleanContent = removeURLs(cleanContent);

  return cleanContent;
}

export default formatEmail;

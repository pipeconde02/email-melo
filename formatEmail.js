import pkg from "quoted-printable";
const { decode } = pkg;

// Función para extraer el enlace entre corchetes
function extractLink(rawEmail) {
  // Decodificar el contenido quoted-printable
  const decodedEmail = decode(rawEmail);

  // Usar una expresión regular para buscar la URL entre corchetes []
  const regex = /\[([^\]]+)\]/;  // Busca lo que esté entre corchetes
  const match = decodedEmail.match(regex);

  if (match && match[1]) {
    return match[1];  // Devolver solo el enlace encontrado
  }

  return null;  // Si no se encuentra el enlace, retornar null
}

export default extractLink;

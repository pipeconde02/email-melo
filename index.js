import express from "express";
import bodyParser from "body-parser";
import imaps from "imap-simple";
import cors from "cors";
import fs from "fs";
import formatEmail from "./formatEmail.js"; // Importa la función para formatear el email

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cargar los asuntos a omitir desde el archivo omitSubjects.json
const omitSubjects = JSON.parse(fs.readFileSync('omitSubjects.json', 'utf8')).subjectsToOmit;

// Función para extraer solo texto plano del cuerpo del correo
const extractPlainText = (htmlBody) => {
  // Eliminar etiquetas HTML
  const text = htmlBody.replace(/<[^>]*>/g, '');
  return text.replace(/=\r?\n/g, ''); // Eliminar codificación MIME (si aplica)
};

// Verificar si el asunto del correo está en la lista de omisión
const shouldOmitEmail = (subject) => {
  return omitSubjects.includes(subject);
};

// Endpoint para obtener correos
app.post("/emails", async (req, res) => {
  const { email } = req.body; // El correo que nos envía el usuario

  // Configuración del servidor IMAP
  const config = {
    imap: {
      user: "cuentas@zonasocial.co",
      password: "Correr2025*",
      host: "zonasocial.co",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }, // Desactiva la validación del certificado
    },
  };

  try {
    console.log("Intentando conectar al servidor IMAP...");
    const connection = await imaps.connect(config);
    console.log("Conexión exitosa al servidor IMAP.");

    console.log("Abriendo buzón INBOX...");
    await connection.openBox("INBOX");
    console.log("Buzón INBOX abierto.");

    // Filtrar correos de la última hora
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 24); // Restar 1 hora
    const sinceTime = oneHourAgo.toISOString();
    console.log(`Fecha de búsqueda (última hora): ${sinceTime}`);

    const searchCriteria = [
      ["TO", email],
      ["SINCE", sinceTime], // Filtrar desde la última hora
    ];
    console.log(`Criterios de búsqueda: ${JSON.stringify(searchCriteria)}`);

    const fetchOptions = { bodies: ["HEADER", "TEXT"], markSeen: false };
    console.log("Buscando correos con los criterios especificados...");
    const messages = await connection.search(searchCriteria, fetchOptions);

    console.log(`Correos encontrados: ${messages.length}`);

    const emails = messages.map((message) => {
      const subject = message.parts.find((part) => part.which === "HEADER").body.subject[0];
      const from = message.parts.find((part) => part.which === "HEADER").body.from[0];
      const date = message.attributes.date;
      const body = message.parts.find((part) => part.which === "TEXT").body;

      // Verificar si el correo debe ser omitido
      if (shouldOmitEmail(subject)) {
        console.log(`Correo con asunto "${subject}" omitido.`);
        return null; // Omitir correo
      }

      const plainBody = extractPlainText(body); // Extraemos solo el texto plano del cuerpo

      // Formateamos el cuerpo del correo antes de enviarlo al frontend
      const formattedBody = formatEmail(plainBody);

      console.log(`Correo encontrado: ${subject}, de: ${from}, fecha: ${date}`);
      return { subject, from, date, body: formattedBody };
    }).filter(email => email !== null); // Filtramos los correos omitidos

    connection.end();
    console.log("Conexión al servidor IMAP cerrada.");
    res.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "Error fetching emails" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));

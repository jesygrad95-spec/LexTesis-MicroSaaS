// Archivo: api/gemini-proxy.js
// Esta función se ejecuta en el servidor de Vercel y protege tu clave API.

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';

// La clave de Gemini se lee de la variable de entorno de Vercel (protegida).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// La función principal que Vercel ejecuta.
export default async function handler(req, res) {
    // 1. Verificar el método (solo aceptamos POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    // 2. Verificar la clave de Vercel (la caja fuerte)
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Error de configuración: La clave GEMINI_API_KEY no está definida en Vercel.' });
    }

    // 3. Extraer el payload del frontend (la información del usuario)
    const { userQuery, systemPrompt } = req.body;

    if (!userQuery || !systemPrompt) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: userQuery y systemPrompt.' });
    }

    // Construir el payload para la API de Gemini
    const geminiPayload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // 4. Llamar a la API de Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const result = await response.json();
        
        // Manejar errores de la API de Gemini
        if (!response.ok || !result.candidates || result.candidates.length === 0) {
            console.error('Error de respuesta de Gemini:', result);
            return res.status(response.status).json({ error: result.error?.message || 'Error desconocido al generar contenido con Gemini.' });
        }

        const text = result.candidates[0].content?.parts?.[0]?.text;

        // 5. Devolver el texto generado al frontend (sin exponer la clave)
        res.status(200).json({ text });

    } catch (error) {
        console.error('Error general del proxy:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud.' });
    }
}

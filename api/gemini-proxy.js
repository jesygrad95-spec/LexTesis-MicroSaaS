import { GoogleGenAI } from '@google/genai';

// Esta función es la Serverless Function de Vercel (el proxy).
// Su función es tomar la solicitud del frontend y enviarla a la API de Gemini
// de forma segura, usando la clave secreta guardada en Vercel.
export default async function handler(req, res) {
    // 1. Verificar el método de la solicitud (debe ser POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed, only POST is accepted.' });
    }

    // 2. Obtener la clave API de las Variables de Entorno de Vercel (SEGURO).
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Error 500 si la clave no está configurada en Vercel
        console.error("GEMINI_API_KEY no configurada en Vercel Environment Variables.");
        return res.status(500).json({ 
            proxyError: '500 - CONFIG_ERROR',
            detail: 'La clave GEMINI_API_KEY no se encontró en las variables de entorno de Vercel.' 
        });
    }

    // 3. Inicializar el cliente de Gemini
    // Nota: El cliente de Google Gen AI se instala automáticamente en Vercel.
    const ai = new GoogleGenAI({ apiKey });

    // 4. Extraer los datos del cuerpo de la solicitud (prompt, model, systemInstruction)
    const { prompt, model = 'gemini-2.5-flash', systemInstruction } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Falta el campo "prompt" en la solicitud.' });
    }

    // 5. Construir la configuración de generación
    const config = {
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {}
    };

    // Agregar la instrucción del sistema (System Instruction) si existe
    if (systemInstruction) {
        config.config.systemInstruction = systemInstruction;
    }

    try {
        // 6. Llamar a la API de Gemini
        const response = await ai.models.generateContent(config);

        const text = response.text;
        
        // 7. Enviar la respuesta exitosa al frontend
        res.status(200).json({ text: text });

    } catch (error) {
        // 8. Capturar errores de la API de Gemini (e.g., permisos, límites, modelo no encontrado)
        console.error('Error al llamar a la API de Gemini:', error);
        
        const proxyErrorMessage = `Error al llamar a la API de Gemini. Verifique límites, permisos, o si la clave API es incorrecta. Mensaje: ${error.message}`;
        
        return res.status(500).json({ 
            proxyError: '500 - API_CALL_FAILED', 
            detail: proxyErrorMessage 
        });
    }
}

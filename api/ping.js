export default function handler(request, response) {
    return response.status(200).json({
        status: 'ok',
        message: 'Pong! 🏓 API is alive (no DB)'
    });
}

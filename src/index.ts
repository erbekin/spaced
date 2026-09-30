import express from "express";
import { shutdown } from "./lib/shutdown";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { config } from "./modules/config";
import buildRouters from "./modules/build-routers";
import { usernameExpressHook } from "./modules/user/username";

const app = express();

app.use(morgan('dev'))
app.use(express.json())
app.use(cookieParser())

// hello server
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
// this hook, normalizes usernames in params
usernameExpressHook(app);
buildRouters(app);

// not found
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found', url: req.url, method: req.method });
});

const port = config.port;
const server = app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});

process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
process.on('SIGINT', () => shutdown(server, 'SIGINT'));

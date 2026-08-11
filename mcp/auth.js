import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { apiBase } from './bridge.js';
/**
 * Подключение к Chatick.
 *
 * Порядок такой:
 *  1. токен из памяти — внутри одной сессии он берётся отсюда;
 *  2. токен с диска — чтобы код не вводили каждый раз заново;
 *  3. запущенное десктопное приложение — оно спрашивает человека само;
 *  4. device flow — код в браузере, как раньше.
 *
 * Третий шаг и есть то, ради чего затевался MCP: у кого стоит приложение,
 * тот не набирает код вообще. У кого не стоит — работает по-старому, а не
 * упирается в «поставьте приложение».
 */
const TOKEN_FILE = join(homedir(), '.chatick', 'mcp-token.json');
/**
 * Где слушает десктоп — читаем из файла, а не берём жёсткий номер.
 *
 * Порт 17325 может быть занят: чужим сервисом, второй копией приложения,
 * зависшим процессом. Приложение в таком случае берёт любой свободный и
 * пишет его сюда вместе с секретом. Жёсткое число означало бы, что выдача
 * доступа тихо перестаёт работать ровно у того, у кого порт занят.
 */
const PORT_FILE = join(homedir(), '.chatick', 'desktop-port.json');
let memory = null;
function load() {
    try {
        return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
    }
    catch {
        return null;
    }
}
function save(s) {
    try {
        mkdirSync(join(homedir(), '.chatick'), { recursive: true });
        writeFileSync(TOKEN_FILE, JSON.stringify(s, null, 2));
        // Токен даёт доступ ко всей рабочей переписке: файл читает только владелец.
        // На Windows chmod почти ничего не значит, но и вреда не делает.
        chmodSync(TOKEN_FILE, 0o600);
    }
    catch {
        // Не сохранилось — работаем в памяти до конца сессии.
    }
}
/** Живой ли токен: дешёвый запрос, который заодно проверяет права. */
async function alive(token) {
    try {
        const res = await fetch(`${apiBase()}/x/projects`, { headers: { authorization: `Bearer ${token}` } });
        return res.ok;
    }
    catch {
        return false;
    }
}
/**
 * Попросить приложение одобрить код — вместо того чтобы человек его набирал.
 *
 * Токен приложение НЕ отдаёт, и это правильнее, чем казалось сначала: код уже
 * выпущен сервером на наше имя, приложение лишь подтверждает его от лица
 * вошедшего человека — тем же вызовом, что и кнопка «одобрить» на экране
 * подключения. Значит нет второго пути выдачи токена, который пришлось бы
 * защищать отдельно, и токен по-прежнему забираем только мы.
 *
 * Возвращает false, если приложения нет или человек отказал: это обычный
 * случай, а не ошибка — код тогда вводят руками.
 */
async function askDesktopToApprove(userCode) {
    try {
        // Нет файла — приложение не запущено.
        const meta = JSON.parse(readFileSync(PORT_FILE, 'utf8'));
        if (!meta.port || !meta.secret)
            return false;
        const res = await fetch(`http://127.0.0.1:${meta.port}/grant`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-chatick-secret': meta.secret },
            body: JSON.stringify({ client: 'Claude Code', code: userCode }),
            // Человек должен успеть выбрать проект и нажать кнопку, но и висеть
            // вечно нельзя.
            signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok)
            return false;
        const data = (await res.json());
        return data.approved === true;
    }
    catch {
        // Приложение не запущено, отказало, окно закрыли.
        return false;
    }
}
/** Шаг 1 device flow: получить код, который человек введёт в браузере. */
export async function startDeviceFlow() {
    const res = await fetch(`${apiBase()}/x/device`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client: 'Claude Code (MCP)' }),
    });
    if (!res.ok)
        throw new Error(`Chatick did not issue a code: HTTP ${res.status}`);
    return (await res.json());
}
/** Шаг 2: дождаться подтверждения. Возвращает null, если время вышло. */
export async function waitForApproval(deviceCode, maxMs = 300_000) {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await fetch(`${apiBase()}/x/device/poll`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ deviceCode }),
        });
        const data = (await res.json());
        if (data.status === 'approved' && data.token) {
            return {
                token: data.token,
                user: data.user,
                projectId: data.project?.id ?? null,
                savedAt: new Date().toISOString(),
            };
        }
        // denied и expired — конец: человек отказал или код протух. Дальше опрос
        // бессмысленен, и молчаливое ожидание выглядело бы как зависание.
        if (data.status === 'denied' || data.status === 'expired')
            return null;
    }
    return null;
}
/** Токен, если он уже есть и жив. Ничего не спрашивает. */
export async function currentScope() {
    if (memory && (await alive(memory.token)))
        return memory;
    const stored = load();
    if (stored && (await alive(stored.token))) {
        memory = { token: stored.token, projectId: stored.projectId };
        return memory;
    }
    return null;
}
/**
 * Подключиться через установленное приложение.
 *
 * Порядок: берём код у сервера, просим приложение одобрить его, забираем
 * токен. Человек при этом видит окно с выбором проекта и жмёт кнопку — код
 * ему набирать не приходится, хотя формально это тот же device flow.
 *
 * null означает «не вышло»: приложения нет, оно отказало или человек закрыл
 * окно. Вызывающий тогда показывает код обычным способом.
 */
export async function connectViaDesktop() {
    // Файл порта проверяем ДО того, как просить код: иначе на каждой попытке
    // подключения без приложения сервер выпускал бы код в никуда.
    try {
        const meta = JSON.parse(readFileSync(PORT_FILE, 'utf8'));
        if (!meta.port)
            return null;
    }
    catch {
        return null;
    }
    const started = await startDeviceFlow();
    const approved = await askDesktopToApprove(started.userCode);
    if (!approved)
        return null;
    // Код одобрен — токен уже ждёт нас.
    const granted = await waitForApproval(started.deviceCode, 15_000);
    if (!granted)
        return null;
    save(granted);
    memory = { token: granted.token, projectId: granted.projectId };
    return memory;
}
/** Записать токен, полученный device flow. */
export function acceptToken(stored) {
    save(stored);
    memory = { token: stored.token, projectId: stored.projectId };
    return memory;
}
export function forget() {
    memory = null;
}
//# sourceMappingURL=auth.js.map
/**
 * Единственное место, которое знает адреса моста.
 *
 * Инструменты не пишут URL руками и не собирают строки запроса: они называют
 * ручку, а путь берётся отсюда. Это ответ на вопрос «как не разъехаться с
 * мостом»: разъехаться можно только здесь, в одном файле на двадцать строк,
 * и сверка при сборке ловит расхождение (scripts/check-bridge-guide.mjs).
 *
 * За сессию гайд отставал от кода дважды — оба раза молча, потому что копий
 * правды было две. Третья копия в MCP повторила бы это, да ещё и на чужой
 * машине, где никто не заметит.
 */
const BASE = process.env.CHATICK_API ?? 'https://api.chatick.com';
export class BridgeError extends Error {
    status;
    hint;
    constructor(status, message, hint) {
        super(message);
        this.status = status;
        this.hint = hint;
    }
}
/**
 * Вызов ручки моста.
 *
 * `?project=` дописывается сам, когда токен компанейский: забыть его — самый
 * частый способ получить отказ, и человек в этой ошибке не виноват.
 */
export async function call(scope, method, path, body, query) {
    const url = new URL(`${BASE}/x${path}`);
    if (scope.projectId)
        url.searchParams.set('project', scope.projectId);
    for (const [k, v] of Object.entries(query ?? {})) {
        if (v !== undefined && v !== '')
            url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, {
        method,
        headers: {
            authorization: `Bearer ${scope.token}`,
            ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        // JSON.stringify экранирует сам: обратный слэш в ивритском тексте больше
        // не ломает тело запроса, как это было при ручной сборке строки.
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    /**
     * Разбираем по тому, что пришло, а не вслепую.
     *
     * GET /guide отдаёт markdown, и слепой JSON.parse ронял вызов с
     * «Unexpected token '#'». Инструкция была недостижима через инструмент,
     * который сам же велит прочитать её первым делом.
     */
    const ct = res.headers.get('content-type') ?? '';
    const looksJson = ct.includes('json') || /^\s*[[{]/.test(text);
    const data = text && looksJson ? JSON.parse(text) : text ? { text } : {};
    if (!res.ok) {
        throw new BridgeError(res.status, data.error ?? `HTTP ${res.status}`, data.hint);
    }
    return data;
}
/** Сколько осталось туннелю — по этому числу решают, браться ли за длинное. */
export async function tunnelLeft(scope) {
    const res = await fetch(`${BASE}/x/projects`, { headers: { authorization: `Bearer ${scope.token}` } });
    const left = res.headers.get('x-tunnel-expires-in');
    return left ? Number(left) : null;
}
export const apiBase = () => BASE;
/**
 * Загрузка файла — единственное место, где тело не JSON.
 *
 * Отдельная функция, а не флаг в call(): там тело всегда сериализуется в
 * JSON, и multipart туда не вписывается, не сломав остальные сорок вызовов.
 *
 * Токен подставляется здесь же и наружу не выходит. Отдавать его модели,
 * чтобы она собрала curl сама, значило бы положить доступ в контекст и в
 * историю переписки, откуда его не отозвать.
 */
export async function upload(scope, path, file, extra) {
    const url = new URL(`${BASE}/x${path}`);
    if (scope.projectId)
        url.searchParams.set('project', scope.projectId);
    const form = new FormData();
    form.set('file', new Blob([file.bytes], { type: file.type || 'application/octet-stream' }), file.name);
    for (const [k, v] of Object.entries(extra ?? {}))
        form.set(k, v);
    // content-type не ставим руками: границу multipart генерирует сам FormData,
    // и подменённый заголовок ломает разбор на сервере.
    const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${scope.token}` },
        body: form,
    });
    const text = await res.text();
    const data = text && /^\s*[[{]/.test(text) ? JSON.parse(text) : { text };
    if (!res.ok) {
        throw new BridgeError(res.status, data.error ?? `HTTP ${res.status}`, data.hint);
    }
    return data;
}
/**
 * Скачать файл проекта на эту машину.
 *
 * Отдельно от call(): тот читает ответ как ТЕКСТ, и картинка или архив
 * превратились бы в мусор. Здесь берём байты и кладём на диск — ассистенту
 * нужен путь, который он сможет открыть, а не содержимое в переписке.
 */
export async function download(scope, path, saveTo) {
    const url = new URL(`${BASE}/x${path}`);
    if (scope.projectId)
        url.searchParams.set('project', scope.projectId);
    const res = await fetch(url, { headers: { authorization: `Bearer ${scope.token}` } });
    if (!res.ok) {
        // Ошибку сервер отдаёт JSON'ом, а не файлом — читаем как текст.
        const text = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try {
            const j = JSON.parse(text);
            if (j.error)
                msg = j.error;
        }
        catch {
            /* не JSON — оставляем код */
        }
        throw new BridgeError(res.status, msg);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const { writeFile } = await import('node:fs/promises');
    await writeFile(saveTo, bytes);
    return { path: saveTo, bytes: bytes.length };
}
//# sourceMappingURL=bridge.js.map
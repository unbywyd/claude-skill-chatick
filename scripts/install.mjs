#!/usr/bin/env node
/**
 * Ставит MCP-сервер Chatick одной командой.
 *
 * Зачем отдельный скрипт: скил — это текст, он ничего не умеет ставить. Без
 * сервера ассистент каждый раз печатает код и просит ввести его руками, и
 * человек не понимает, почему обещанная кнопка не появляется. Причём ему
 * неоткуда узнать, что чего-то не хватает: скил на месте, приложение стоит,
 * а всё равно код.
 *
 * Делает ровно два дела: ставит зависимости и прописывает сервер в
 * ~/.claude.json. Идемпотентно — повторный запуск чинит, а не ломает.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const mcpDir = join(here, '..', 'mcp')
const configFile = join(homedir(), '.claude.json')

const say = (s) => console.log(s)
const die = (s) => {
  console.error(`\n✗ ${s}`)
  process.exit(1)
}

if (!existsSync(join(mcpDir, 'index.js'))) die(`Не найден сервер: ${mcpDir}. Склонируйте скил целиком.`)

// 1. Зависимости. Их две, но без них сервер не стартует, а Claude покажет
//    его как «failed» без объяснения причины.
say('Ставлю зависимости…')
try {
  execFileSync('npm', ['install', '--omit=dev', '--silent'], { cwd: mcpDir, stdio: 'inherit', shell: process.platform === 'win32' })
} catch {
  die('npm install не прошёл. Нужен Node 18+ и доступ в сеть.')
}

// 2. Регистрация. Пишем прямо в конфиг: CLI `claude` есть не везде (и не
//    работает в неинтерактивной сессии), а формат записи один и тот же.
if (!existsSync(configFile)) die(`Не найден ${configFile}. Запустите Claude Code хотя бы раз.`)

let config
try {
  config = JSON.parse(readFileSync(configFile, 'utf8'))
} catch {
  die(`${configFile} повреждён — не рискую его переписывать.`)
}

// Файл живой и большой: в нём вся история работы. Копия перед записью — на
// случай, если что-то пойдёт не так на середине.
const backup = `${configFile}.bak`
copyFileSync(configFile, backup)

config.mcpServers = config.mcpServers ?? {}
const already = config.mcpServers.chatick
config.mcpServers.chatick = {
  type: 'stdio',
  // Абсолютный путь: Claude Code запускает сервер из произвольной папки.
  command: 'node',
  args: [join(mcpDir, 'index.js')],
  env: {},
}
writeFileSync(configFile, JSON.stringify(config, null, 2))

// Читаем обратно: молча испорченный конфиг хуже, чем ненастроенный сервер.
try {
  const check = JSON.parse(readFileSync(configFile, 'utf8'))
  if (!check.mcpServers?.chatick) throw new Error('запись не сохранилась')
} catch (e) {
  copyFileSync(backup, configFile)
  die(`Не записалось (${e.message}). Конфиг возвращён из копии.`)
}

say(already ? '\n✓ Сервер Chatick обновлён.' : '\n✓ Сервер Chatick установлен.')
say(`  конфиг: ${configFile}`)
say(`  копия:  ${backup}`)
say('\nПерезапустите Claude Code — без этого новый сервер не подхватится.')
say('Потом просто спросите, что на вас в Chatick: код вводить не придётся.')

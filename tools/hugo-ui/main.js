const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

let mainWindow = null
let hugoProcess = null

// Config next to the .exe takes priority; fall back to the bundled one (dev mode).
// PORTABLE_EXECUTABLE_DIR is set by electron-builder portable target and points to
// the real directory where the user placed the .exe (not the temp extraction dir).
const _exeDir     = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'))
const _exeConfig  = path.join(_exeDir, 'config.json')
const CONFIG_PATH = fs.existsSync(_exeConfig) ? _exeConfig : path.join(__dirname, 'config.json')
const CONFIG_DIR  = path.dirname(CONFIG_PATH)
const LOG_PATH    = path.join(CONFIG_DIR, 'hugo-ui.log')

function log(level, ...args) {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map(a =>
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  ).join(' ')}\n`
  process.stdout.write(line)
  try { fs.appendFileSync(LOG_PATH, line) } catch {}
}

// Catch unhandled errors in main process
process.on('uncaughtException',  err => log('ERROR', 'uncaughtException', err.stack || err.message))
process.on('unhandledRejection', err => log('ERROR', 'unhandledRejection', err))


function readConfig() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  return resolveConfigPaths(raw)
}

function resolvePath(p, base) {
  if (!p || path.isAbsolute(p)) return p
  return path.resolve(base || CONFIG_DIR, p)
}

// Two different bases on purpose:
//  • repoRoot / hugoBin / gitBin are resolved against CONFIG_DIR (the folder holding
//    config.json — next to the .exe), because they live outside the site checkout.
//  • staticRoot / assetsRoot / contentRoot / directories[].path are resolved against
//    repoRoot, because they are always inside the git working copy. This guarantees
//    the files you edit are the same files that get committed and pushed.
// Absolute paths are still honoured everywhere, so old configs keep working.
function resolveConfigPaths(config) {
  const r = { ...config }
  log('INFO', 'CONFIG_DIR:', CONFIG_DIR)
  const resolve = (key, val, base) => {
    const resolved = resolvePath(val, base)
    log('INFO', `  ${key}: ${val} → ${resolved}`)
    return resolved
  }
  if (r.repoRoot)    r.repoRoot    = resolve('repoRoot',    r.repoRoot)
  if (r.hugoBin)     r.hugoBin     = resolve('hugoBin',     r.hugoBin)
  if (r.gitBin)      r.gitBin      = resolve('gitBin',      r.gitBin)

  const siteBase = r.repoRoot || CONFIG_DIR
  log('INFO', 'site base (repoRoot):', siteBase)

  if (r.staticRoot)  r.staticRoot  = resolve('staticRoot',  r.staticRoot,  siteBase)
  if (r.assetsRoot)  r.assetsRoot  = resolve('assetsRoot',  r.assetsRoot,  siteBase)
  if (r.contentRoot) r.contentRoot = resolve('contentRoot', r.contentRoot, siteBase)
  if (r.directories) {
    r.directories = r.directories.map(d => {
      const resolved = resolvePath(d.path, siteBase)
      log('INFO', `  dir "${d.path}" → ${resolved}`)
      return { ...d, path: resolved }
    })
  }

  // Warn loudly if any content path ends up outside the git working copy —
  // that means edits would never be committed.
  if (r.repoRoot) {
    const inRepo = p => !p || p.replace(/\\/g, '/').toLowerCase()
      .startsWith(r.repoRoot.replace(/\\/g, '/').toLowerCase())
    const strays = [
      ['staticRoot',  r.staticRoot],
      ['assetsRoot',  r.assetsRoot],
      ['contentRoot', r.contentRoot],
      ...(r.directories || []).map(d => ['directory', d.path]),
    ].filter(([, p]) => !inRepo(p))
    if (strays.length) {
      log('WARN', 'Ці шляхи ЗА МЕЖАМИ repoRoot — зміни в них не потраплять у коміт:',
        strays.map(([k, p]) => `${k}=${p}`).join(' | '))
    }
  }
  return r
}

// Find the directory config entry whose path contains the given file path
function dirConfigFor(filePath, directories) {
  const normalized = filePath.replace(/\\/g, '/')
  return directories.find(d => normalized.startsWith(d.path.replace(/\\/g, '/'))) || {}
}

ipcMain.handle('log', (_, level, ...args) => log(level, '[renderer]', ...args))

function createWindow() {
  log('INFO', 'app starting, config:', CONFIG_PATH)
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile('index.html')
}

// recursive === false → показуємо лише .md у самій теці, дочірні теки повністю
// ігноруємо. Потрібно для записів, що вказують на батьківську теку (напр.
// content/ukrainian), чиї підпапки вже налаштовані окремими записами —
// інакше вони продублювалися б у дереві.
function buildTree(dirPath, exclude, recursive = true) {
  const children = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        if (!recursive) continue
        children.push({
          type: 'dir',
          name: entry.name,
          path: full,
          children: buildTree(full, exclude, recursive),
        })
      } else if (entry.name.endsWith('.md')) {
        children.push({
          type: 'file',
          name: entry.name,
          path: full,
        })
      }
    }
  } catch {
    // skip unreadable
  }
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return children
}

ipcMain.handle('get-tree', () => {
  const config = readConfig()
  return config.directories.map(dir => ({
    // alias — людська назва теки в дереві. Впливає лише на відображення:
    // path лишається справжнім, тож збереження, git і tooltip не зачеплені.
    name: dir.alias || dir.path.replace(/\\/g, '/').split('/').pop() || dir.path,
    path: dir.path,
    // recursive не задано → true, щоб старі конфіги поводились як раніше
    children: buildTree(dir.path, dir.exclude || [], dir.recursive !== false),
  }))
})

// Returns schema for the directory that owns this file
ipcMain.handle('get-schema', (_, filePath) => {
  const { directories } = readConfig()
  const dir = dirConfigFor(filePath, directories)
  return dir.schema || []
})

ipcMain.handle('read-file', (_, filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    if (!match) return { frontMatter: {}, body: raw }

    const frontMatter = {}
    for (const line of match[1].split(/\r?\n/)) {
      const sep = line.indexOf(':')
      if (sep === -1) continue
      const key = line.slice(0, sep).trim()
      const val = line.slice(sep + 1).trim()

      if (val.startsWith('[') && val.endsWith(']')) {
        frontMatter[key] = val
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      } else if (val === 'true') {
        frontMatter[key] = true
      } else if (val === 'false') {
        frontMatter[key] = false
      } else {
        frontMatter[key] = val.replace(/^["']|["']$/g, '')
      }
    }

    return { frontMatter, body: match[2] }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('write-file', (_, filePath, frontMatter, body) => {
  try {
    const lines = Object.entries(frontMatter).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map(s => `"${s}"`).join(', ')}]`
      if (typeof v === 'boolean') return `${k}: ${v}`
      return `${k}: "${v}"`
    })
    fs.writeFileSync(filePath, `---\n${lines.join('\n')}\n---\n${body}`, 'utf-8')
    return { ok: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('get-all-pages', () => {
  const config = readConfig()
  const contentRoot = (config.contentRoot || '').replace(/\\/g, '/')
  const pages = []

  const scanDir = (dirPath, exclude) => {
    try {
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (exclude.includes(entry.name)) continue
        const full = path.join(dirPath, entry.name)
        if (entry.isDirectory()) { scanDir(full, exclude); continue }
        if (!entry.name.endsWith('.md')) continue
        let title = entry.name.replace('.md', '')
        try {
          const raw = fs.readFileSync(full, 'utf-8')
          const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
          if (m) {
            const t = m[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)
            if (t) title = t[1]
          }
        } catch {}
        // Compute the published URL: strip contentRoot, strip the language
        // subdirectory (first segment, e.g. "ukrainian"), strip .md, add trailing /.
        // e.g. content/ukrainian/event/event-3.md → /event/event-3/
        let rel = full
        if (contentRoot) {
          const segments = full.replace(/\\/g, '/').replace(contentRoot, '').replace(/^\//, '').replace(/\.md$/, '').split('/')
          segments.shift() // remove language dir (e.g. "ukrainian")
          rel = '/' + segments.join('/') + '/'
        }
        pages.push({ path: full, relativePath: rel, title })
      }
    } catch {}
  }

  for (const dir of config.directories) scanDir(dir.path, dir.exclude || [])
  return pages
})

ipcMain.handle('list-static-files', (_, relPath) => {
  const { staticRoot } = readConfig()
  const fullPath = path.join(staticRoot, relPath)
  try {
    return fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(e => e.isFile())
      .map(e => ({
        name: e.name,
        relativePath: relPath.replace(/\\/g, '/').replace(/^\//, '') + '/' + e.name,
        fullPath: path.join(fullPath, e.name).replace(/\\/g, '/'),
      }))
  } catch { return [] }
})

ipcMain.handle('list-all-images', () => {
  const config = readConfig()
  const imageBase = config.assetsRoot || config.staticRoot
  const media = config.media
  const imageDirs = media?.images || []
  const result = []
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }

  const scanDir = (absDir, relDir, baseRel) => {
    try {
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        const absEntry = path.join(absDir, entry.name)
        const relEntry = relDir + '/' + entry.name
        if (entry.isDirectory()) {
          scanDir(absEntry, relEntry, baseRel)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (!mimeMap[ext]) continue
          let dataUrl = null
          try {
            const data = fs.readFileSync(absEntry)
            dataUrl = `data:${mimeMap[ext]};base64,${data.toString('base64')}`
          } catch {}
          // group = subfolder relative to the media.images root entry
          const group = relDir.slice(baseRel.length).replace(/^\//, '') || baseRel
          result.push({
            name: entry.name,
            group,
            relativePath: relEntry.replace(/^\//, ''),
            dataUrl,
          })
        }
      }
    } catch {}
  }

  for (const rel of imageDirs) {
    scanDir(path.join(imageBase, rel), rel, rel)
  }
  return result
})

ipcMain.handle('list-all-documents', () => {
  const config = readConfig()
  const { staticRoot, media } = config
  const docDirs = media?.documents || []
  const result = []

  for (const rel of docDirs) {
    const fullDir = path.join(staticRoot, rel)
    try {
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        result.push({
          name: entry.name,
          dir: rel,
          relativePath: rel.replace(/\\/g, '/') + '/' + entry.name,
        })
      }
    } catch {}
  }
  return result
})

ipcMain.handle('get-suggestions', (_, dirPath) => {
  log('INFO', 'get-suggestions', dirPath)
  const { directories } = readConfig()
  const dir = dirConfigFor(dirPath + '/', directories)
  if (!dir.schema) log('WARN', 'get-suggestions: no schema found for', dirPath)
  const schema = dir.schema || []
  const exclude = dir.exclude || []
  const recursive = dir.recursive !== false

  // only string and array fields make sense for suggestions
  const tracked = new Set(
    schema.filter(f => f.type === 'string' || f.type === 'array').map(f => f.name)
  )
  const suggestions = {}

  const scanDir = (p) => {
    try {
      for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
        if (exclude.includes(entry.name)) continue
        const full = path.join(p, entry.name)
        // той самий recursive, що й у дереві — щоб автодоповнення не тягнуло
        // значення з підпапок, які цьому запису не належать
        if (entry.isDirectory()) { if (recursive) scanDir(full); continue }
        if (!entry.name.endsWith('.md')) continue
        try {
          const raw = fs.readFileSync(full, 'utf-8')
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
          if (!match) continue
          for (const line of match[1].split(/\r?\n/)) {
            const sep = line.indexOf(':')
            if (sep === -1) continue
            const key = line.slice(0, sep).trim()
            if (!tracked.has(key)) continue
            const val = line.slice(sep + 1).trim()
            if (!suggestions[key]) suggestions[key] = new Set()
            if (val.startsWith('[') && val.endsWith(']')) {
              val.slice(1, -1).split(',')
                .map(s => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean)
                .forEach(v => suggestions[key].add(v))
            } else if (val && val !== 'true' && val !== 'false') {
              suggestions[key].add(val.replace(/^["']|["']$/g, ''))
            }
          }
        } catch {}
      }
    } catch {}
  }

  scanDir(dirPath)

  const result = {}
  for (const [k, v] of Object.entries(suggestions)) {
    if (v.size > 0) result[k] = [...v].sort()
  }
  return result
})

ipcMain.handle('next-file-name', (_, dirPath) => {
  const { directories } = readConfig()
  const dir = dirConfigFor(dirPath + '/', directories)
  const pattern = dir.fileNamePattern
  if (!pattern) return { name: '' }
  if (!pattern.includes('{n}')) return { name: pattern }

  const prefix = pattern.slice(0, pattern.indexOf('{n}'))
  const suffix = pattern.slice(pattern.indexOf('{n}') + 3)

  let maxN = 0
  try {
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      const base = file.endsWith('.md') ? file.slice(0, -3) : file
      if (!base.startsWith(prefix) || !base.endsWith(suffix)) continue
      const inner = base.slice(prefix.length, suffix ? base.length - suffix.length : undefined)
      const n = parseInt(inner, 10)
      if (!isNaN(n) && n > maxN) maxN = n
    }
  } catch {}

  return { name: pattern.replace('{n}', maxN + 1) }
})

ipcMain.handle('create-file', (_, dirPath, fileName) => {
  try {
    const name = fileName.endsWith('.md') ? fileName : fileName + '.md'
    const fullPath = path.join(dirPath, name)

    if (fs.existsSync(fullPath)) return { error: 'Файл вже існує' }

    const { directories } = readConfig()
    const dir = dirConfigFor(dirPath + '/', directories)
    const schema   = dir.schema   || []
    const template = dir.template || {}
    const templateFm   = template.frontMatter || {}
    const templateBody = template.body || ''

    const today = () => new Date().toISOString().slice(0, 10)

    const fm = {}
    for (const field of schema) {
      if (field.default !== undefined) {
        fm[field.name] = field.default === 'today' ? today() : field.default
      }
    }
    for (const [k, v] of Object.entries(templateFm)) {
      fm[k] = v === 'today' ? today() : v
    }

    const lines = Object.entries(fm).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map(s => `"${s}"`).join(', ')}]`
      if (typeof v === 'boolean') return `${k}: ${v}`
      return `${k}: "${v}"`
    })

    fs.writeFileSync(fullPath, `---\n${lines.join('\n')}\n---\n${templateBody}`, 'utf-8')
    return { path: fullPath }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Git & Hugo handlers ────────────────────────────────

// spawn with an args array — Node.js uses CreateProcessW on Windows, which handles
// spaces in both the executable path and arguments correctly without needing cmd /c.
function spawnSafe(bin, args, opts) {
  const cwd = opts && opts.cwd
  if (cwd && !fs.existsSync(cwd)) {
    throw Object.assign(new Error(`Папку не знайдено: ${cwd}`), { code: 'ENODIR' })
  }
  return spawn(bin, args, opts)
}

ipcMain.handle('git-pull', () => {
  const config = readConfig()
  const gitBin = config.gitBin || 'git'
  const cwd    = config.repoRoot
  log('INFO', 'git-pull: gitBin =', gitBin, '| cwd =', cwd)

  const makeRun = runCwd => args => new Promise((resolve, reject) => {
    log('INFO', 'git run:', [gitBin, ...args].join(' '))
    let p
    try { p = spawnSafe(gitBin, args, { cwd: runCwd }) } catch (e) { return reject(e) }
    let out = '', err = ''
    p.stdout.on('data', d => out += d)
    p.stderr.on('data', d => err += d)
    p.on('close', code => {
      log('INFO', `git ${args[0]} exit=${code}`, out.trim() || err.trim())
      code === 0 ? resolve(out) : reject(new Error(err || `exit ${code}`))
    })
    p.on('error', e => { log('ERROR', `git ${args[0]} spawn error:`, e.message); reject(e) })
  })

  // If repoRoot is not a git repo, clone instead of pull
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    if (!config.gitRemote) {
      const msg = `Папку не знайдено: ${cwd}. Вкажіть "gitRemote" в config.json для автоматичного клонування.`
      log('ERROR', msg)
      return Promise.resolve({ error: msg })
    }
    log('INFO', 'git-pull: repoRoot not found — cloning', config.gitRemote)
    const runIn = makeRun(CONFIG_DIR)
    const runInRepo = makeRun(cwd)
    return runIn(['clone', config.gitRemote, cwd])
      .then(() => runInRepo(['submodule', 'update', '--init', '--recursive'])
        .catch(e => { log('WARN', 'submodule update after clone:', e.message) }))
      .then(() => { log('INFO', 'git-pull: clone done'); return { ok: true, cloned: true } })
      .catch(e => { log('ERROR', 'git clone failed:', e.message); return { error: e.message } })
  }

  const run = makeRun(cwd)

  const toLines = s => s.split('\n').map(f => f.trim()).filter(Boolean)

  let stashed = false

  // Collect only modified (M) tracked files and new untracked files — skip deletions (D)
  // so that git pull can freely restore them without stash pop re-deleting them
  return Promise.all([
    run(['diff', '--name-only', '--diff-filter=M']),
    run(['ls-files', '--others', '--exclude-standard']),
  ])
  .then(([modified, untracked]) => {
    const files = [...toLines(modified), ...toLines(untracked)]
    log('INFO', 'files to stash:', files.length ? files.join(', ') : '(none)')
    if (!files.length) return
    stashed = true
    return run(['stash', 'push', '--include-untracked', '--', ...files])
  })
  .then(()  => run(['pull']))
  .then(out => {
    if (!stashed) return out
    return run(['stash', 'pop'])
      .then(() => out)
      .catch(e => { log('WARN', 'stash pop:', e.message); return out })
  })
  .then(out => {
    // Init/update any git submodules (e.g. the theme). Failure is non-fatal.
    return run(['submodule', 'update', '--init', '--recursive'])
      .then(() => out)
      .catch(e => { log('WARN', 'submodule update:', e.message); return out })
  })
  .then(out => { log('INFO', 'git-pull: done'); return { ok: true, stdout: out } })
  .catch(e  => { log('ERROR', 'git-pull failed:', e.message); return { error: e.message } })
})

ipcMain.handle('git-commit-push', (_, message) => {
  const config = readConfig()
  const gitBin = config.gitBin || 'git'
  const cwd    = config.repoRoot
  const run = args => new Promise((resolve, reject) => {
    let p
    try { p = spawnSafe(gitBin, args, { cwd }) } catch (e) { return reject(e) }
    let out = '', err = ''
    p.stdout.on('data', d => out += d)
    p.stderr.on('data', d => err += d)
    p.on('close', code => code === 0 ? resolve(out) : reject(new Error(err || `exit ${code}`)))
    p.on('error', reject)
  })
  return run(['add', '-A'])
    .then(()  => run(['commit', '-m', message]))
    .then(()  => run(['push']))
    .then(out => ({ ok: true, stdout: out }))
    .catch(e  => ({ error: e.message }))
})

ipcMain.handle('delete-file', (_, filePath) => {
  try {
    fs.unlinkSync(filePath)
    log('INFO', 'delete-file:', filePath)
    return { ok: true }
  } catch (e) {
    log('ERROR', 'delete-file:', e.message)
    return { error: e.message }
  }
})

ipcMain.handle('hugo-server-start', () => {
  if (hugoProcess) return { error: 'already running' }
  const config  = readConfig()
  const hugoBin = config.hugoBin || 'hugo'
  const cwd     = config.repoRoot
  // --baseURL ensures resource URLs in generated HTML always match the server port,
  // preventing cross-origin SRI/CORS failures when hugo.toml has a stale local baseURL.
  // --disableFastRender prevents Hugo from serving cached assets compiled under a different baseURL.
  try {
    hugoProcess = spawnSafe(hugoBin, ['server', '--baseURL', 'http://localhost:1313/', '--disableFastRender'], { cwd })
  } catch (e) {
    log('ERROR', 'hugo-server-start:', e.message)
    return { error: e.message }
  }
  const send = (type, text) =>
    mainWindow?.webContents.send('hugo-output', { type, text })
  hugoProcess.stdout.on('data', d => send('stdout', d.toString()))
  hugoProcess.stderr.on('data', d => send('stderr', d.toString()))
  hugoProcess.on('close', code => { send('exit', String(code)); hugoProcess = null })
  hugoProcess.on('error', e    => { send('error', e.message);   hugoProcess = null })
  return { ok: true }
})

ipcMain.handle('hugo-server-stop', () => {
  if (!hugoProcess) return { ok: true }
  if (process.platform === 'win32' && hugoProcess.pid) {
    // taskkill /F /T kills the process and its entire child tree (hugo may spawn children).
    const system32 = path.dirname(process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe')
    const taskkill = path.join(system32, 'taskkill.exe')
    spawn(taskkill, ['/F', '/T', '/PID', String(hugoProcess.pid)])
  } else {
    hugoProcess.kill()
  }
  hugoProcess = null
  return { ok: true }
})

ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

ipcMain.handle('get-config-path', () => CONFIG_PATH)

ipcMain.handle('get-media-config', () => {
  const config = readConfig()
  return {
    images:    config.media?.images    || [],
    documents: config.media?.documents || [],
  }
})

ipcMain.handle('copy-media-file', (_, srcPath, type, subDir) => {
  const config = readConfig()
  const destDir = type === 'image'
    ? path.join(config.assetsRoot || config.staticRoot, subDir)
    : path.join(config.staticRoot, subDir)
  try {
    fs.mkdirSync(destDir, { recursive: true })
    const destPath = path.join(destDir, path.basename(srcPath))
    fs.copyFileSync(srcPath, destPath)
    log('INFO', 'copy-media-file:', srcPath, '→', destPath)
    return { ok: true }
  } catch (e) {
    log('ERROR', 'copy-media-file:', e.message)
    return { error: e.message }
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/**
 * Agent Zero Sidecar.
 *
 * Spawns the Agent Zero Python environment as a dedicated child process and
 * pipes its stdout/stderr directly into a broadcast callback so the thought
 * process and browser-navigation commands appear on the Roku TV UI in real-time.
 *
 * Behaviour
 * ─────────
 *   • Starts  : spawn python <entryScript> in <workDir>
 *   • Streams : every output line emitted as an 'AgentZeroLine' event
 *   • Restarts: on unexpected exit the sidecar waits RESTART_DELAY_MS then
 *               re-spawns (up to MAX_RESTARTS times to avoid crash loops)
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

export interface AgentZeroOptions {
  /** Absolute path to the agent-zero working directory. */
  workDir:       string
  /** Python interpreter to use (default: 'python3'). */
  pythonBin?:    string
  /** Entry-point script within workDir (default: 'run_ui.py'). */
  entryScript?:  string
  /** Extra environment variables forwarded to the process. */
  env?:          Record<string, string>
  /** Delay between restart attempts in ms (default: 3000). */
  restartDelay?: number
  /** Maximum number of automatic restart attempts (default: 10). */
  maxRestarts?:  number
}

export interface AgentZeroLine {
  source:    'stdout' | 'stderr'
  text:      string
  timestamp: number
}

// Typed EventEmitter interface (declaration-merge pattern for Node.js).
interface AgentZeroSidecarEvents {
  line:    (data: AgentZeroLine) => void
  exit:    (info: { code: number | null; signal: string | null; attempt: number }) => void
  restart: (attempt: number) => void
  error:   (err: Error) => void
}

// ---------------------------------------------------------------------------
// AgentZeroSidecar
// ---------------------------------------------------------------------------

export class AgentZeroSidecar extends EventEmitter {
  // Typed emit/on overloads so callers get autocomplete without strict-generic hacks.
  declare emit: <K extends keyof AgentZeroSidecarEvents>(
    event: K, ...args: Parameters<AgentZeroSidecarEvents[K]>
  ) => boolean

  declare on: <K extends keyof AgentZeroSidecarEvents>(
    event: K, listener: AgentZeroSidecarEvents[K]
  ) => this

  private proc:          ChildProcess | null = null
  private restartCount   = 0
  private _running       = false
  private shutdownFlag   = false

  private readonly pythonBin:    string
  private readonly entryScript:  string
  private readonly restartDelay: number
  private readonly maxRestarts:  number

  constructor(private readonly opts: AgentZeroOptions) {
    super()
    this.pythonBin    = opts.pythonBin    ?? 'python3'
    this.entryScript  = opts.entryScript  ?? 'run_ui.py'
    this.restartDelay = opts.restartDelay ?? 3_000
    this.maxRestarts  = opts.maxRestarts  ?? 10
  }

  get isRunning(): boolean { return this._running }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Spawn the Agent Zero process (idempotent — does nothing if already running). */
  start(): void {
    if (this._running) return
    this.shutdownFlag  = false
    this.restartCount  = 0
    this.spawnProcess()
  }

  /** Send a command to the agent's stdin (e.g. a user prompt). */
  send(command: string): void {
    if (!this._running || !this.proc?.stdin) {
      throw new Error('AgentZeroSidecar: process is not running')
    }
    const line = command.endsWith('\n') ? command : command + '\n'
    this.proc.stdin.write(line)
  }

  /** Gracefully stop the sidecar; will not auto-restart after this call. */
  stop(): void {
    this.shutdownFlag = true
    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc    = null
      this._running = false
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private spawnProcess(): void {
    const proc = spawn(this.pythonBin, [this.entryScript], {
      cwd:   this.opts.workDir,
      env:   { ...process.env, ...this.opts.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.proc    = proc
    this._running = true

    proc.stdout?.setEncoding('utf8')
    proc.stderr?.setEncoding('utf8')

    let stdoutBuf = ''
    let stderrBuf = ''

    proc.stdout?.on('data', (chunk: string) => {
      stdoutBuf += chunk
      const lines  = stdoutBuf.split('\n')
      stdoutBuf    = lines.pop() ?? ''
      for (const text of lines) {
        if (text.trim()) {
          this.emit('line', { source: 'stdout', text, timestamp: Date.now() })
        }
      }
    })

    proc.stderr?.on('data', (chunk: string) => {
      stderrBuf += chunk
      const lines  = stderrBuf.split('\n')
      stderrBuf    = lines.pop() ?? ''
      for (const text of lines) {
        if (text.trim()) {
          this.emit('line', { source: 'stderr', text, timestamp: Date.now() })
        }
      }
    })

    proc.on('error', (err) => {
      this._running = false
      this.emit('error', err)
    })

    proc.on('exit', (code, signal) => {
      this._running = false
      this.proc     = null
      const attempt = this.restartCount

      this.emit('exit', { code, signal, attempt })

      if (this.shutdownFlag) return
      if (this.restartCount >= this.maxRestarts) {
        this.emit('error', new Error(
          `AgentZeroSidecar: exceeded max restarts (${this.maxRestarts})`,
        ))
        return
      }

      this.restartCount++
      this.emit('restart', this.restartCount)
      setTimeout(() => this.spawnProcess(), this.restartDelay)
    })
  }
}

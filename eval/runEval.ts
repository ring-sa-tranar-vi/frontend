import './windowShim'

import { join } from 'node:path'
import { buildScenario } from './buildScenario'
import { loadConfig } from './config'
import { evalConfig } from './eval.config'
import { runJudge } from './judge'
import { runConversation } from './orchestrator'
import {
  printSummary,
  writeBatchSummary,
  writeHtmlReport,
  writeResultArtifact,
} from './report'
import { phase, timeIt } from './timing'
import type { RunResult } from './types'

async function main() {
  const cfg = loadConfig()

  phase(
    `Bygger scenario "${evalConfig.scenarioType}" (tränare ${evalConfig.trainerId}, övning ${evalConfig.workoutId})...`,
  )
  const scenario = await buildScenario(evalConfig, cfg.apiBaseUrl)
  console.log(
    `    ✓ ${scenario.label} — tränare "${scenario.trainerName}", övning "${scenario.session.workoutName}"`,
  )

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const resultsDir = join(import.meta.dirname, 'results', timestamp)

  const results: RunResult[] = []

  for (let runIndex = 0; runIndex < evalConfig.runs; runIndex++) {
    const result = await runConversation(
      scenario,
      evalConfig.userInstruction,
      runIndex,
      cfg,
    )

    if (!result.error) {
      phase(`Körning #${runIndex + 1} — domaren bedömer samtalet...`)
      try {
        result.judge = await timeIt('domare', () =>
          runJudge({
            apiKey: cfg.apiKey,
            model: cfg.judgeModel,
            scenario,
            transcript: result.transcript,
            toolLog: result.toolLog,
            deterministic: result.deterministic,
          }),
        )
      } catch (e) {
        result.error = `Domaren misslyckades: ${e instanceof Error ? e.message : String(e)}`
      }
    }

    results.push(result)
    writeResultArtifact(result, resultsDir)
    console.log(
      result.error
        ? `\n✖ Körning #${runIndex + 1} FEL (${result.error})`
        : `\n✔ Körning #${runIndex + 1} klar (${result.turnCount} turer${result.judge ? `, poäng ${result.judge.score}` : ''})`,
    )
  }

  phase('Skriver rapport...')
  printSummary(results)

  writeBatchSummary(results, resultsDir)
  const reportPath = writeHtmlReport(results, resultsDir)
  console.log(`\n✅ HTML-rapport: ${reportPath}`)

  const anyFailed = results.some((r) => {
    if (r.error) return true
    const detOk = r.deterministic.every((d) => d.pass)
    const judgeOk = r.judge?.overallPass ?? false
    return !(detOk && judgeOk)
  })
  if (anyFailed) process.exitCode = 1
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})

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
import type { RunResult } from './types'

async function main() {
  const cfg = loadConfig()

  console.log(
    `Bygger scenario "${evalConfig.scenarioType}" (tränare ${evalConfig.trainerId}, övning ${evalConfig.workoutId})...`,
  )
  const scenario = await buildScenario(evalConfig, cfg.apiBaseUrl)

  console.log(`Kör ${evalConfig.runs} samtal (modell: ${cfg.coachModel})...`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const resultsDir = join(import.meta.dirname, 'results', timestamp)

  const results: RunResult[] = []

  for (let runIndex = 0; runIndex < evalConfig.runs; runIndex++) {
    process.stdout.write(`  ${scenario.label} — körning #${runIndex + 1} ... `)
    const result = await runConversation(
      scenario,
      evalConfig.userInstruction,
      runIndex,
      cfg,
    )

    if (!result.error) {
      try {
        result.judge = await runJudge({
          apiKey: cfg.apiKey,
          model: cfg.judgeModel,
          scenario,
          transcript: result.transcript,
          toolLog: result.toolLog,
          deterministic: result.deterministic,
        })
      } catch (e) {
        result.error = `Domaren misslyckades: ${e instanceof Error ? e.message : String(e)}`
      }
    }

    results.push(result)
    writeResultArtifact(result, resultsDir)
    console.log(
      result.error
        ? `FEL (${result.error})`
        : `klar (${result.turnCount} turer)`,
    )
  }

  console.log('')
  printSummary(results)

  writeBatchSummary(results, resultsDir)
  const reportPath = writeHtmlReport(results, resultsDir)
  console.log(`\nHTML-rapport: ${reportPath}`)

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

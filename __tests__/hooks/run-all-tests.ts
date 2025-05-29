/**
 * Test runner for all custom hooks
 *
 * This script runs all hook tests and provides a summary report
 */

import { execSync } from "child_process"
import { readdirSync } from "fs"
import { join } from "path"

interface TestResult {
  file: string
  passed: boolean
  duration: number
  coverage?: number
  errors?: string[]
}

class HookTestRunner {
  private testDir = __dirname
  private results: TestResult[] = []

  /**
   * Run all hook tests
   */
  async runAllTests(): Promise<void> {
    console.log("🧪 Running comprehensive hook tests...\n")

    const testFiles = this.getTestFiles()

    for (const file of testFiles) {
      await this.runSingleTest(file)
    }

    this.printSummary()
  }

  /**
   * Get all test files
   */
  private getTestFiles(): string[] {
    return readdirSync(this.testDir)
      .filter((file) => file.endsWith(".test.tsx"))
      .sort()
  }

  /**
   * Run a single test file
   */
  private async runSingleTest(file: string): Promise<void> {
    const startTime = Date.now()
    console.log(`📋 Testing ${file}...`)

    try {
      const output = execSync(`npm test -- ${join(this.testDir, file)} --verbose --coverage`, {
        encoding: "utf8",
        timeout: 30000, // 30 second timeout
      })

      const duration = Date.now() - startTime
      const coverage = this.extractCoverage(output)

      this.results.push({
        file,
        passed: true,
        duration,
        coverage,
      })

      console.log(`✅ ${file} passed (${duration}ms, ${coverage}% coverage)\n`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errors = this.extractErrors(error.stdout || error.message)

      this.results.push({
        file,
        passed: false,
        duration,
        errors,
      })

      console.log(`❌ ${file} failed (${duration}ms)`)
      console.log(`   Errors: ${errors.join(", ")}\n`)
    }
  }

  /**
   * Extract coverage percentage from test output
   */
  private extractCoverage(output: string): number {
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/)
    return coverageMatch ? Number.parseFloat(coverageMatch[1]) : 0
  }

  /**
   * Extract error messages from test output
   */
  private extractErrors(output: string): string[] {
    const errorLines = output
      .split("\n")
      .filter((line) => line.includes("FAIL") || line.includes("Error:"))
      .map((line) => line.trim())
      .slice(0, 3) // Limit to first 3 errors

    return errorLines.length > 0 ? errorLines : ["Unknown error"]
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const totalTests = this.results.length
    const passedTests = this.results.filter((r) => r.passed).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    const avgCoverage =
      this.results.filter((r) => r.coverage).reduce((sum, r) => sum + (r.coverage || 0), 0) / totalTests

    console.log("📊 Test Summary")
    console.log("================")
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} ✅`)
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? "❌" : ""}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Average Coverage: ${avgCoverage.toFixed(1)}%`)
    console.log("")

    if (failedTests > 0) {
      console.log("❌ Failed Tests:")
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   ${r.file}: ${r.errors?.join(", ")}`)
        })
      console.log("")
    }

    // Coverage report
    console.log("📈 Coverage Report:")
    this.results
      .filter((r) => r.coverage)
      .sort((a, b) => (b.coverage || 0) - (a.coverage || 0))
      .forEach((r) => {
        const status = (r.coverage || 0) >= 80 ? "✅" : "⚠️"
        console.log(`   ${r.file}: ${r.coverage}% ${status}`)
      })

    console.log("")
    console.log(passedTests === totalTests ? "🎉 All tests passed!" : "⚠️ Some tests failed")
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new HookTestRunner()
  runner.runAllTests().catch(console.error)
}

export { HookTestRunner }

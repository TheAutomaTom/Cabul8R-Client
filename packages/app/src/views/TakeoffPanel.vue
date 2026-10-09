<script setup lang="ts">
import { computed } from 'vue'
import { describeCalibration } from '@cabul8r/document'
import { useWorkbench } from '@cabul8r/workbench'
import { useLengthFormat } from '../format'
import { measure, taxonomy, usePlans } from '../plans'

/** Drawn vs. scaled size of every measurement: the seed of the M9 takeoff report. */
const wb = useWorkbench()
const plans = usePlans()
const fmt = useLengthFormat()

const rows = computed(() =>
  plans.measurements.flatMap((m, i) => {
    const page = plans.page(m.pageId)
    if (!page) return []
    const { paperMm, realMm } = measure(page, m)
    return [
      {
        id: m.id,
        pageId: m.pageId,
        n: i + 1,
        page: plans.pageName(m.pageId),
        drawn: fmt.paper(paperMm),
        scaled: realMm === undefined ? '—' : fmt.real(realMm),
        scale: describeCalibration(page.calibration),
      },
    ]
  }),
)
</script>

<template>
  <div class="takeoff">
    <p v-if="!rows.length" class="empty">
      Measurements appear here with their drawn (paper) and scaled (real) lengths. Use the Measure
      tool on a {{ taxonomy.label('page').toLowerCase() }}.
    </p>
    <table v-else data-testid="takeoff-table">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ taxonomy.label('page') }}</th>
          <th class="num">Drawn</th>
          <th class="num">Scaled</th>
          <th>Scale</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.id"
          @click="wb.commands.execute('cabul8r.page.open', r.pageId)"
        >
          <td>{{ r.n }}</td>
          <td>{{ r.page }}</td>
          <td class="num">{{ r.drawn }}</td>
          <td class="num">{{ r.scaled }}</td>
          <td class="scale">{{ r.scale }}</td>
          <td>
            <button
              class="wb-icon-button"
              title="Delete"
              aria-label="Delete measurement"
              @click.stop="plans.removeMeasurement(r.id)"
            >
              <span class="codicon codicon-trash" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.empty {
  margin: 8px 0;
  color: var(--vscode-descriptionForeground);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  user-select: text;
}
th {
  position: sticky;
  top: 0;
  padding: 4px 8px;
  text-align: left;
  font-weight: 600;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}
td {
  padding: 2px 8px;
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover {
  background: var(--vscode-list-hoverBackground);
}
.num {
  text-align: right;
  font-family: var(--vscode-editor-font-family);
  font-variant-numeric: tabular-nums;
}
.scale {
  color: var(--vscode-descriptionForeground);
}
</style>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="text-left text-[0.7rem] uppercase tracking-[0.12em] text-text-muted">
          <th class="py-1.5 pr-2 font-semibold">#</th>
          <th class="py-1.5 pr-2 font-semibold">Equipo</th>
          <th
            v-for="column in columns"
            :key="column.key"
            class="py-1.5 px-1.5 font-semibold text-center"
            :title="column.title"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in standings"
          :key="row.name"
          class="standings-row"
          :class="{ 'standings-row--leader': row.position === 1 }"
        >
          <td class="py-1.5 pr-2 text-text-muted tabular-nums">{{ row.position }}</td>
          <td class="py-1.5 pr-2 font-medium">
            <span class="flex items-center gap-1.5">
              <span
                v-if="showTrophy && row.position === 1"
                class="text-[0.85rem] leading-none"
                aria-hidden="true"
                >🏆</span
              >
              {{ row.name }}
            </span>
          </td>
          <td
            v-for="column in columns"
            :key="column.key"
            class="py-1.5 px-1.5 text-center tabular-nums"
            :class="{ 'font-bold text-win': column.key === 'points' }"
          >
            {{ row[column.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  standings: {
    type: Array,
    required: true,
  },
  /** Muestra el trofeo al líder (sólo cuando la competición está cerrada). */
  showTrophy: {
    type: Boolean,
    default: false,
  },
  columns: {
    type: Array,
    default: () => [
      { key: 'played', label: 'PJ', title: 'Partidos jugados' },
      { key: 'won', label: 'G', title: 'Ganados' },
      { key: 'drawn', label: 'E', title: 'Empatados' },
      { key: 'lost', label: 'P', title: 'Perdidos' },
      { key: 'goalsFor', label: 'GF', title: 'Goles a favor' },
      { key: 'goalsAgainst', label: 'GC', title: 'Goles en contra' },
      { key: 'diff', label: 'Dif', title: 'Diferencia de goles' },
      { key: 'points', label: 'Pts', title: 'Puntos' },
    ],
  },
})
</script>

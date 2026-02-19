<template>
  <div class="statistics-panel-vue">
    <p class="statistics-intro">{{ t('statisticsIntro') }}</p>
    <div class="statistics-grid">
      <StatisticsCharts
        :chart-range="chartRange"
        :set-chart-range="setChartRange"
        :charts-visible="data.groupVisible['charts'] ?? false"
      />
      <StatisticsGroup
        title-id="stat-economy"
        :title-label="t('economyTitle')"
        data-stat-group="economy"
        :visible="data.groupVisible['economy'] ?? false"
      >
        <StatisticsCard :label="t('currentCoins')" :value="data.stats['coins']" stat-id="coins" />
        <StatisticsCard :label="t('productionEffective')" :value="data.stats['production']" stat-id="production" />
        <StatisticsCard :label="t('totalCoinsEverLabel')" :value="data.stats['total-coins-ever']" stat-id="total-coins-ever" />
        <StatisticsCard :label="t('avgCoinsPerClick')" :value="data.stats['coins-per-click-avg']" stat-id="coins-per-click-avg" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-production-breakdown"
        :title-label="t('productionBreakdownTitle')"
        data-stat-group="production-breakdown"
        :visible="data.groupVisible['production-breakdown'] ?? false"
      >
        <StatisticsCard :label="t('baseRate')" :value="data.stats['base-production']" stat-id="base-production" />
        <StatisticsCard :label="t('planetBonus')" :value="data.stats['planet-bonus']" stat-id="planet-bonus" />
        <StatisticsCard :label="t('prestigeBonus')" :value="data.stats['prestige-bonus']" stat-id="prestige-bonus" />
        <StatisticsCard :label="t('crewBonus')" :value="data.stats['crew-bonus']" stat-id="crew-bonus" />
        <StatisticsCard v-show="data.eventsUnlocked" :label="t('eventMultiplier')" :value="data.stats['event-mult']" stat-id="event-mult" />
        <StatisticsCard :label="t('researchBonus')" :value="data.stats['research-bonus']" stat-id="research-bonus" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-progression"
        :title-label="t('progressionTitle')"
        data-stat-group="progression"
        :visible="data.groupVisible['progression'] ?? false"
      >
        <StatisticsCard :label="t('planetsCount')" :value="data.stats['planets-count']" stat-id="planets-count" />
        <StatisticsCard :label="t('upgradesOwned')" :value="data.stats['upgrades-count']" stat-id="upgrades-count" />
        <StatisticsCard :label="t('slotsUsedTotal')" :value="data.stats['slots-used']" stat-id="slots-used" />
        <StatisticsCard :label="t('prestigeLevel')" :value="data.stats['prestige-level']" stat-id="prestige-level" />
        <StatisticsCard :label="t('prestigesToday')" :value="data.stats['prestiges-today']" stat-id="prestiges-today" />
        <StatisticsCard :label="t('researchNodesUnlocked')" :value="data.stats['research-nodes-unlocked']" stat-id="research-nodes-unlocked" />
        <StatisticsCard :label="t('expeditionStatus')" :value="data.stats['expedition-status']" stat-id="expedition-status" />
        <StatisticsCard :label="t('crewFree')" :value="data.stats['crew-count']" stat-id="crew-count" />
        <StatisticsCard :label="t('crewAssigned')" :value="data.stats['assigned-astronauts']" stat-id="assigned-astronauts" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-activity"
        :title-label="t('activityTitle')"
        data-stat-group="activity"
        :visible="data.groupVisible['activity'] ?? false"
      >
        <StatisticsCard :label="t('clicksLifetime')" :value="data.stats['clicks-lifetime']" stat-id="clicks-lifetime" />
        <StatisticsCard :label="t('clicksSession')" :value="data.stats['clicks-session']" stat-id="clicks-session" />
        <StatisticsCard :label="t('coinsFromClicksSession')" :value="data.stats['coins-from-clicks-session']" stat-id="coins-from-clicks-session" />
        <StatisticsCard :label="t('totalPlayTime')" :value="data.stats['play-time']" stat-id="play-time" />
        <StatisticsCard :label="t('sessionDuration')" :value="data.stats['session-duration']" stat-id="session-duration" />
        <StatisticsCard :label="t('playingSince')" :value="data.stats['playing-since']" stat-id="playing-since" />
        <StatisticsCard :label="t('peakProductionChart')" :value="data.stats['peak-production-chart']" stat-id="peak-production-chart" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-run-stats"
        :title-label="t('runStatsTitle')"
        data-stat-group="run-stats"
        :visible="data.groupVisible['run-stats'] ?? false"
      >
        <StatisticsCard :label="t('runDuration')" :value="data.stats['run-duration']" stat-id="run-duration" />
        <StatisticsCard :label="t('runCoinsEarned')" :value="data.stats['run-coins-earned']" stat-id="run-coins-earned" />
        <StatisticsCard :label="t('runQuestsClaimed')" :value="data.stats['run-quests-claimed']" stat-id="run-quests-claimed" />
        <StatisticsCard :label="t('runEventsTriggered')" :value="data.stats['run-events-triggered']" stat-id="run-events-triggered" />
        <StatisticsCard :label="t('runMaxCombo')" :value="data.stats['run-max-combo']" stat-id="run-max-combo" />
        <StatisticsCard :label="t('runAvgCoinsPerSec')" :value="data.stats['run-avg-coins-per-sec']" stat-id="run-avg-coins-per-sec" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-quests-events"
        :title-label="t('questsEventsTitle')"
        data-stat-group="quests-events"
        :visible="data.groupVisible['quests-events'] ?? false"
      >
        <StatisticsCard :label="t('questStreak')" :value="data.stats['quest-streak']" stat-id="quest-streak" />
        <StatisticsCard v-show="data.eventsUnlocked" :label="t('activeEvents')" :value="data.stats['active-events-count']" stat-id="active-events-count" />
        <StatisticsCard v-show="data.eventsUnlocked" :label="t('nextEventIn')" :value="data.stats['next-event-in']" stat-id="next-event-in" />
      </StatisticsGroup>
      <StatisticsGroup
        title-id="stat-achievements"
        :title-label="t('achievementsTitle')"
        data-stat-group="achievements"
        :visible="data.groupVisible['achievements'] ?? false"
      >
        <StatisticsCard
          wide
          :label="t('unlockedLabel')"
          :value1="data.stats['achievements-unlocked']"
          suffix=" / "
          :value2="data.stats['achievements-total']"
          stat-id1="achievements-unlocked"
          stat-id2="achievements-total"
        />
      </StatisticsGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '../../application/strings.js';
import { useStatisticsData } from '../composables/useStatisticsData.js';
import StatisticsCard from '../components/StatisticsCard.vue';
import StatisticsGroup from '../components/StatisticsGroup.vue';
import StatisticsCharts from '../components/StatisticsCharts.vue';

const { data, chartRange, setChartRange } = useStatisticsData();
</script>

<style scoped>
.statistics-intro {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0 0 1.25rem 0;
  line-height: 1.45;
}

.statistics-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

</style>

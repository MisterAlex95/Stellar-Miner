<template>
  <div class="json-tree">
    <!-- Object -->
    <template v-if="isObject">
      <div
        v-for="k in keysToShow"
        :key="String(k)"
        class="tree-node"
      >
        <div
          v-if="!isPrimitive(parent[k])"
          class="tree-group"
        >
          <button
            type="button"
            class="tree-group-head"
            :aria-expanded="!getCollapsed(k)"
            @click="toggleCollapsed(k)"
          >
            <span class="tree-chevron" :class="{ 'tree-chevron--closed': getCollapsed(k) }" aria-hidden="true">▸</span>
            <span class="tree-key">{{ k }}</span>
            <span class="tree-type-badge tree-type-badge--object">{{ isArrayVal(parent[k]) ? 'array' : 'object' }}</span>
          </button>
          <div v-show="!getCollapsed(k)" class="tree-group-body" role="region" :aria-hidden="getCollapsed(k)">
            <JsonTreeEditor :parent="parent[k]" :filter="filter" />
          </div>
        </div>
        <div v-else class="tree-row">
          <span class="tree-key tree-key--inline">{{ k }}</span>
          <span class="tree-type-badge tree-type-badge--number" v-if="typeof parent[k] === 'number'">#</span>
          <span class="tree-type-badge tree-type-badge--string" v-else-if="typeof parent[k] === 'string'">S</span>
          <span class="tree-type-badge tree-type-badge--bool" v-else-if="typeof parent[k] === 'boolean'">✓</span>
          <div class="tree-value">
            <div v-if="typeof parent[k] === 'number'" class="tree-number-wrap">
              <button type="button" class="tree-stepper" aria-label="Decrease" @click="stepNumber(k, -1)">−</button>
              <input
                type="number"
                step="any"
                :value="parent[k]"
                class="tree-input tree-input--number"
                @input="setNumber(k, $event)"
              />
              <button type="button" class="tree-stepper" aria-label="Increase" @click="stepNumber(k, 1)">+</button>
            </div>
            <template v-else-if="typeof parent[k] === 'string'">
              <textarea
                v-if="isLongString(parent[k]) && stringExpanded[k]"
                :value="parent[k]"
                class="tree-input tree-input--textarea"
                spellcheck="false"
                rows="3"
                @input="parent[k] = ($event.target as HTMLTextAreaElement).value"
              />
              <template v-else>
                <input
                  type="text"
                  :value="parent[k]"
                  class="tree-input tree-input--string"
                  spellcheck="false"
                  @input="parent[k] = ($event.target as HTMLInputElement).value"
                />
                <button v-if="isLongString(parent[k])" type="button" class="tree-expand-str" @click="toggleStringExpand(k)">{{ stringExpanded[k] ? '−' : '…' }}</button>
              </template>
            </template>
            <label v-else-if="typeof parent[k] === 'boolean'" class="tree-check-wrap">
              <input
                type="checkbox"
                :checked="parent[k]"
                class="tree-checkbox"
                @change="parent[k] = ($event.target as HTMLInputElement).checked"
              />
              <span class="tree-check-label">{{ parent[k] ? 'true' : 'false' }}</span>
            </label>
            <span v-else class="tree-null">null</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Array -->
    <template v-else-if="isArray">
      <div
        v-for="(item, i) in parent"
        :key="i"
        class="tree-node"
      >
        <div v-if="!isPrimitive(item)" class="tree-group tree-group--array">
          <button
            type="button"
            class="tree-group-head"
            :aria-expanded="!getArrayCollapsed(i)"
            @click="toggleArrayCollapsed(i)"
          >
            <span class="tree-chevron" :class="{ 'tree-chevron--closed': getArrayCollapsed(i) }" aria-hidden="true">▸</span>
            <span class="tree-index">[{{ i }}]</span>
            <span class="tree-type-badge tree-type-badge--object">{{ isArrayVal(item) ? 'array' : 'object' }}</span>
          </button>
          <div v-show="!getArrayCollapsed(i)" class="tree-group-body" role="region" :aria-hidden="getArrayCollapsed(i)">
            <JsonTreeEditor :parent="parent[i]" :filter="filter" />
          </div>
        </div>
        <div v-else class="tree-row tree-row--array">
          <span class="tree-index tree-index--inline">[{{ i }}]</span>
          <span class="tree-type-badge tree-type-badge--number" v-if="typeof item === 'number'">#</span>
          <span class="tree-type-badge tree-type-badge--string" v-else-if="typeof item === 'string'">S</span>
          <span class="tree-type-badge tree-type-badge--bool" v-else-if="typeof item === 'boolean'">✓</span>
          <div class="tree-value">
            <div v-if="typeof item === 'number'" class="tree-number-wrap">
              <button type="button" class="tree-stepper" aria-label="Decrease" @click="stepArrayNumber(i, -1)">−</button>
              <input
                type="number"
                step="any"
                :value="item"
                class="tree-input tree-input--number"
                @input="setArrayNumber(i, $event)"
              />
              <button type="button" class="tree-stepper" aria-label="Increase" @click="stepArrayNumber(i, 1)">+</button>
            </div>
            <input
              v-else-if="typeof item === 'string'"
              type="text"
              :value="item"
              class="tree-input tree-input--string"
              spellcheck="false"
              @input="parent[i] = ($event.target as HTMLInputElement).value"
            />
            <label v-else-if="typeof item === 'boolean'" class="tree-check-wrap">
              <input
                type="checkbox"
                :checked="item"
                class="tree-checkbox"
                @change="parent[i] = ($event.target as HTMLInputElement).checked"
              />
              <span class="tree-check-label">{{ item ? 'true' : 'false' }}</span>
            </label>
            <span v-else class="tree-null">null</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, inject, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    parent: Record<string, unknown> | unknown[];
    filter?: string;
  }>(),
  { filter: '' }
);

const treeExpandSignal = inject<{ value: 'expand' | 'collapse' | null }>('treeExpandSignal', ref(null));

const isObject = computed(() => props.parent !== null && !Array.isArray(props.parent) && typeof props.parent === 'object');
const isArray = computed(() => Array.isArray(props.parent));
const objectKeys = computed(() =>
  isObject.value ? (Object.keys(props.parent as Record<string, unknown>) as string[]) : []
);
const keysToShow = computed(() => {
  if (!props.filter?.trim()) return objectKeys.value;
  const q = props.filter.trim().toLowerCase();
  return objectKeys.value.filter((k) => k.toLowerCase().includes(q));
});

const collapsedKeys = ref<Set<string>>(new Set());
const collapsedIndices = ref<Set<number>>(new Set());
const stringExpanded = ref<Record<string, boolean>>({});

function isPrimitive(v: unknown): boolean {
  return v === null || typeof v !== 'object';
}

function isArrayVal(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function getCollapsed(k: string): boolean {
  return collapsedKeys.value.has(k);
}
function toggleCollapsed(k: string): void {
  const next = new Set(collapsedKeys.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  collapsedKeys.value = next;
}

function getArrayCollapsed(i: number): boolean {
  return collapsedIndices.value.has(i);
}
function toggleArrayCollapsed(i: number): void {
  const next = new Set(collapsedIndices.value);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  collapsedIndices.value = next;
}

function setNumber(k: string, e: Event): void {
  const raw = (e.target as HTMLInputElement).value;
  const n = Number(raw);
  if (Number.isFinite(n)) (props.parent as Record<string, unknown>)[k] = n;
}

function setArrayNumber(i: number, e: Event): void {
  const raw = (e.target as HTMLInputElement).value;
  const n = Number(raw);
  if (Number.isFinite(n)) (props.parent as unknown[])[i] = n;
}

function stepNumber(k: string, delta: number): void {
  const current = (props.parent as Record<string, unknown>)[k];
  if (typeof current !== 'number') return;
  const step = Math.abs(current) >= 1 ? Math.max(1, Math.abs(current) * 0.1) : 0.1;
  const next = current + delta * step;
  (props.parent as Record<string, unknown>)[k] = Number.isFinite(next) ? next : current;
}
function stepArrayNumber(i: number, delta: number): void {
  const current = (props.parent as unknown[])[i];
  if (typeof current !== 'number') return;
  const step = Math.abs(current) >= 1 ? Math.max(1, Math.abs(current) * 0.1) : 0.1;
  const next = current + delta * step;
  (props.parent as unknown[])[i] = Number.isFinite(next) ? next : current;
}

const LONG_STRING_LEN = 50;
function isLongString(v: unknown): boolean {
  return typeof v === 'string' && v.length > LONG_STRING_LEN;
}
function toggleStringExpand(k: string): void {
  stringExpanded.value = { ...stringExpanded.value, [k]: !stringExpanded.value[k] };
}

watch(
  () => treeExpandSignal?.value,
  (val) => {
    if (!val) return;
    if (val === 'expand') {
      collapsedKeys.value = new Set();
      collapsedIndices.value = new Set();
    } else if (val === 'collapse') {
      if (isObject.value) collapsedKeys.value = new Set(objectKeys.value);
      if (isArray.value) collapsedIndices.value = new Set((props.parent as unknown[]).map((_, i) => i));
    }
  }
);
</script>

<style scoped>
@reference "../../styles/index.css";

.json-tree {
  font-size: 0.8125rem;
}
.tree-node {
  border-left: 2px solid rgba(255, 255, 255, 0.06);
  padding-left: 0.75rem;
  margin-left: 0.25rem;
  margin-top: 0.125rem;
  margin-bottom: 0.125rem;
}
.tree-group {
  margin: 0.25rem 0;
}
.tree-group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  margin-left: -0.625rem;
  border: none;
  border-radius: 0.5rem;
  font: inherit;
  color: var(--text);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.tree-group-head:hover {
  background: var(--bg-card);
}
.tree-group-head:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--accent);
  border-radius: 0.5rem;
}
.tree-chevron {
  font-size: 0.625rem;
  width: 1rem;
  flex-shrink: 0;
  color: var(--text-dim);
  transition: transform 0.2s ease;
  transform: rotate(90deg);
}
.tree-chevron--closed {
  transform: rotate(0deg);
}
.tree-key {
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
}
.tree-key--inline {
  min-width: 8rem;
  font-weight: 400;
  color: var(--text-dim);
}
.tree-index {
  font-family: ui-monospace, monospace;
  font-size: 0.6875rem;
  color: var(--text-dim);
  flex-shrink: 0;
}
.tree-index--inline {
  min-width: 2.5rem;
}
.tree-type-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  flex-shrink: 0;
}
.tree-type-badge--number {
  background: rgba(245, 158, 11, 0.2);
  color: #d97706;
}
.tree-type-badge--string {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}
.tree-type-badge--bool {
  background: rgba(139, 92, 246, 0.2);
  color: #7c3aed;
}
.tree-type-badge--object {
  background: rgba(14, 165, 233, 0.2);
  color: #0284c7;
}
.tree-group-body {
  padding-left: 0.5rem;
  margin-left: 0.25rem;
  border-left: 1px solid var(--border);
  opacity: 0.95;
  animation: tree-open 0.2s ease;
}
@keyframes tree-open {
  from { opacity: 0.6; }
  to { opacity: 0.95; }
}
.tree-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  gap: 0.5rem;
}
.tree-row--array {
  background: var(--bg-card);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin: 0.25rem 0;
  transition: background 0.15s;
}
.tree-row--array:hover {
  background: rgba(245, 158, 11, 0.06);
}
.tree-value {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: flex-start;
}
.tree-value .tree-input--textarea {
  align-self: stretch;
}
.tree-input {
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--bg-dark);
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--text);
  transition: box-shadow 0.15s, border-color 0.15s;
}
.tree-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}
.tree-number-wrap {
  display: flex;
  align-items: center;
  gap: 0;
  width: fit-content;
}
.tree-stepper {
  width: 1.5rem;
  height: 1.75rem;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--text-dim);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.tree-stepper:first-of-type {
  border-radius: 0.375rem 0 0 0.375rem;
  border-right: 0;
}
.tree-stepper:last-of-type {
  border-radius: 0 0.375rem 0.375rem 0;
  border-left: 0;
}
.tree-stepper:hover {
  color: var(--text);
  background: var(--bg-dark);
}
.tree-number-wrap .tree-input--number {
  border-radius: 0;
  width: 6rem;
  border-left: 0;
  border-right: 0;
}
.tree-input--number {
  width: 7rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, monospace;
}
.tree-input--string {
  min-width: 12rem;
  max-width: 24rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
}
.tree-input--textarea {
  min-width: 16rem;
  max-width: 32rem;
  width: 100%;
  resize: vertical;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
}
.tree-expand-str {
  flex-shrink: 0;
  width: 1.5rem;
  padding: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  cursor: pointer;
  margin-left: 0.25rem;
}
.tree-expand-str:hover {
  color: var(--text);
}
.tree-check-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}
.tree-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent);
  cursor: pointer;
}
.tree-check-label {
  font-size: 0.75rem;
  color: var(--text-dim);
}
.tree-null {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-style: italic;
}
</style>

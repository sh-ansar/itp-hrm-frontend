<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthCopy } from '../../i18n/auth'
const { authText } = useAuthCopy()
import { publicAsset } from '../../utils/publicAsset'

const model = defineModel<string>({ required: true })
const props = withDefaults(defineProps<{
  id: string
  label: string
  type?: 'email' | 'password' | 'text'
  autocomplete?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  revealable?: boolean
}>(), { type: 'text', disabled: false, required: false, invalid: false, revealable: false })

const revealed = ref(false)
const inputType = computed(() => props.type === 'password' && props.revealable && revealed.value ? 'text' : props.type)
</script>

<template>
  <div class="base-field">
    <label :for="id">{{ authText(label) }}</label>
    <div class="base-field__control">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="invalid ? 'true' : undefined"
      />
      <button
        v-if="type === 'password' && revealable"
        class="base-field__reveal"
        type="button"
        :disabled="disabled"
        :aria-label="revealed ? authText('Скрыть') : authText('Показать')"
        :title="revealed ? authText('Скрыть пароль') : authText('Показать пароль')"
        @click="revealed = !revealed"
      >
        <img :src="publicAsset(revealed ? 'prototype-icons/eye-slashf.svg' : 'prototype-icons/eyef.svg')" alt="" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.base-field{display:grid;gap:8px}
.base-field label{color:var(--color-text);font-weight:600;font-size:14px}
.base-field__control{position:relative}
.base-field input{width:100%;min-height:44px;border:1px solid var(--color-stroke);background:var(--color-surface-raised);border-radius:var(--radius-md);padding:11px 13px;color:var(--color-text)}
.base-field__control:has(.base-field__reveal) input{padding-right:48px}
.base-field input:focus-visible{outline:3px solid var(--color-focus);outline-offset:1px}
.base-field input[aria-invalid="true"]{border-color:var(--color-danger)}
.base-field input:disabled{background:var(--color-soft);opacity:.65}
.base-field__reveal{position:absolute;right:7px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:34px;height:34px;border:0;background:transparent;padding:0;border-radius:var(--radius-sm);cursor:pointer}
.base-field__reveal img{display:block;width:20px;height:20px}
.base-field__reveal:hover{background:var(--color-soft)}
.base-field__reveal:focus-visible{outline:2px solid var(--color-focus);outline-offset:1px}
.base-field__reveal:disabled{opacity:.5;cursor:not-allowed}
</style>

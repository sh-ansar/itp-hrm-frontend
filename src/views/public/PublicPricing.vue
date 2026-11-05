<script setup lang="ts">
import PublicPlans from '../../components/public/PublicPlans.vue'
import { useSaasText } from '../../i18n/saas'
const { tr } = useSaasText()
</script>
<template>
  <div class="public-pricing">
    <nav class="breadcrumb"><RouterLink :to="{ name: 'public.home' }">{{ tr('home') }}</RouterLink><span>/</span><span>{{ tr('pricing') }}</span></nav>
    <header><h1>{{ tr('plansTitle') }}</h1><p>{{ tr('plansText') }}</p></header>
    <PublicPlans />
    <p class="pricing-help"><RouterLink :to="{ name: 'public.legal', params: { type: 'tariff-policy' } }">{{ tr('tariffPolicy') }}</RouterLink></p>
  </div>
</template>
<style scoped>
.public-pricing{max-width:1240px;min-height:65vh;margin:auto;padding:40px 20px 95px;box-sizing:border-box}
.breadcrumb{display:flex;gap:12px;font-size:13px;color:#75909b;margin-bottom:42px}
.breadcrumb a,.pricing-help a{color:inherit;text-decoration:none}.breadcrumb a:hover,.pricing-help a:hover{color:#009cde}
.public-pricing header{margin-bottom:36px}
.public-pricing h1{font-size:clamp(32px,4vw,50px);font-weight:650;letter-spacing:-.045em;margin:0 0 12px}
.public-pricing header p{font-size:16px;color:#637f89;line-height:1.6}
.pricing-help{margin-top:30px;font-size:13px;color:#568399}
@media(max-width:650px){.public-pricing{padding:28px 16px 60px}.breadcrumb{margin-bottom:25px}}
</style>

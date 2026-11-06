<script setup lang="ts">
import { KpiGrid } from '@itpmining/vue-basic-components'
withDefaults(defineProps<{columns?:2|3|4;label?:string}>(),{columns:4,label:'Основные показатели'})
</script><template><KpiGrid :columns="columns" :label="label" class="base-kpi-grid"><slot/></KpiGrid></template>

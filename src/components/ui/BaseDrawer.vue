<script setup lang="ts">
import { Drawer } from '@itpmining/vue-basic-components'
withDefaults(defineProps<{open:boolean;title:string;description?:string;closeLabel?:string}>(),{description:'',closeLabel:'Закрыть'})
defineEmits<{close:[]}>()
</script><template><Drawer :open="open" :title="title" :description="description" :close-label="closeLabel" @close="$emit('close')"><slot/><template v-if="$slots.footer" #footer><slot name="footer"/></template></Drawer></template>

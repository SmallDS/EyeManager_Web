<script setup>
const props = defineProps({
  customer: { type: Object, required: true },
  exam: { type: Object, required: true },
});

const emit = defineEmits(["save", "delete"]);

const prescriptionColumns = ["球光", "散光", "轴线", "三棱", "基底", "加光", "基弧V", "基弧H", "直径", "裸眼视力", "矫正视力"];
const eyeRows = [
  { use: "远用", useRowSpan: 2, eye: "右", dataKey: "distanceRight", labelPrefix: "远用右眼" },
  { eye: "左", dataKey: "distanceLeft", labelPrefix: "远用左眼" },
  { use: "近用", useRowSpan: 2, eye: "右", dataKey: "nearRight", labelPrefix: "近用右眼" },
  { eye: "左", dataKey: "nearLeft", labelPrefix: "近用左眼" },
];
const pupilFields = [
  { label: "远瞳距", key: "远瞳距_PD" },
  { label: "RPD:", key: "远用右眼单眼瞳距_RPD" },
  { label: "LPD:", key: "远用左眼单眼瞳距_LPD" },
  { label: "近瞳距", key: "近瞳距" },
  { label: "Rh:", key: "右眼瞳高_Rh" },
  { label: "Lh:", key: "左眼瞳高_Lh" },
];

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function cloneExam(exam) {
  return {
    id: exam.id,
    examAt: dateInputValue(exam.examAt),
    distanceRight: { ...(exam.distanceRight || {}) },
    distanceLeft: { ...(exam.distanceLeft || {}) },
    nearRight: { ...(exam.nearRight || {}) },
    nearLeft: { ...(exam.nearLeft || {}) },
    pupil: { ...(exam.pupil || {}) },
    comment: exam.comment || "",
  };
}

const form = ref(cloneExam(props.exam));

watch(
  () => props.exam,
  (exam) => {
    form.value = cloneExam(exam);
  },
  { deep: true },
);

function eyeKey(row, column) {
  return `${row.labelPrefix}_${column}`;
}

function save() {
  emit("save", { id: props.exam.id, payload: form.value });
}
</script>

<template>
  <section class="prescription-sheet">
    <h2>验 光 单</h2>
    <div class="prescription-info">
      <div>
        <span>验光日期：</span>
        <el-date-picker
          v-model="form.examAt"
          class="prescription-date"
          type="date"
          value-format="YYYY-MM-DD"
          format="YYYY年M月D日"
          clearable
        />
      </div>
      <div>
        <span>姓 名：</span>
        <strong>{{ customer.name }}</strong>
      </div>
    </div>

    <div class="prescription-table-wrap">
      <table class="prescription-table">
        <thead>
          <tr>
            <th aria-label="用途" />
            <th aria-label="眼别" />
            <th v-for="column in prescriptionColumns" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in eyeRows" :key="`${row.labelPrefix}-${row.eye}`">
            <th v-if="row.use" class="use-cell" :rowspan="row.useRowSpan">{{ row.use }}</th>
            <th class="eye-cell">{{ row.eye }}</th>
            <td v-for="column in prescriptionColumns" :key="`${row.labelPrefix}-${column}`">
              <el-input
                v-model="form[row.dataKey][eyeKey(row, column)]"
                class="prescription-input"
                clearable
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="prescription-extra">
      <div>
        <span>远瞳距</span>
        <el-input v-model="form.pupil['远瞳距_PD']" class="prescription-input" clearable />
      </div>
      <div>
        <span>RPD:</span>
        <el-input v-model="form.pupil['远用右眼单眼瞳距_RPD']" class="prescription-input" clearable />
      </div>
      <div>
        <span>LPD:</span>
        <el-input v-model="form.pupil['远用左眼单眼瞳距_LPD']" class="prescription-input" clearable />
      </div>
      <div>
        <span>近瞳距</span>
        <el-input v-model="form.pupil['近瞳距']" class="prescription-input" clearable />
      </div>
      <div><span>瞳 高</span></div>
      <div>
        <span>Rh:</span>
        <el-input v-model="form.pupil['右眼瞳高_Rh']" class="prescription-input" clearable />
      </div>
      <div>
        <span>Lh:</span>
        <el-input v-model="form.pupil['左眼瞳高_Lh']" class="prescription-input" clearable />
      </div>
    </div>

    <div class="prescription-comment">
      <span>备 注</span>
      <el-input v-model="form.comment" type="textarea" :rows="2" />
    </div>

    <div class="prescription-actions">
      <el-button type="danger" plain @click="emit('delete', props.exam.id)">删除验光单</el-button>
      <el-button type="primary" @click="save">保存验光单</el-button>
    </div>
  </section>
</template>


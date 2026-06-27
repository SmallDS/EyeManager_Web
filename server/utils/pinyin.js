const CHINESE_RE = /[\u4e00-\u9fff]/;
const PINYIN_INITIALS = [
  ["阿", "a"], ["芭", "b"], ["嚓", "c"], ["搭", "d"], ["蛾", "e"], ["发", "f"],
  ["噶", "g"], ["哈", "h"], ["击", "j"], ["喀", "k"], ["垃", "l"], ["妈", "m"],
  ["拿", "n"], ["哦", "o"], ["啪", "p"], ["期", "q"], ["然", "r"], ["撒", "s"],
  ["塌", "t"], ["挖", "w"], ["昔", "x"], ["压", "y"], ["匝", "z"],
];

function compareChinese(a, b) {
  return a.localeCompare(b, "zh-Hans-CN");
}

function getChineseInitial(char) {
  for (let index = PINYIN_INITIALS.length - 1; index >= 0; index -= 1) {
    const [boundary, initial] = PINYIN_INITIALS[index];
    if (compareChinese(char, boundary) >= 0) {
      return initial;
    }
  }
  return "";
}

export function generatePinyinCode(value) {
  return Array.from(String(value || ""))
    .map((char) => {
      if (/^[a-z0-9]$/i.test(char)) return char.toLowerCase();
      if (CHINESE_RE.test(char)) return getChineseInitial(char);
      return "";
    })
    .join("");
}


// 求证1：window.localStorage 长啥样
console.log("window.localStorage", window.localStorage);

// 求证2：知道了 localStorage 给我们提供的能力，那么怎么实现正删改查呢
// 得出结论：我们发现 设置函数默认返回undefined 而获取函数则返回获取值
console.log('localStorage.setItem("a", 1)', localStorage.setItem("a", 1));
console.log('localStorage.getItem("a", 1)', localStorage.getItem("a"));

// 求证3：看Storage方法上默认挂载了 a 属性，那么按照js的语法我们可以正常访问
console.log("window.localStorage.a", window.localStorage.a);
console.log("window.localStorage.b", window.localStorage.b);

// 现在可以看看我们有那些封装思路

// 第1种：函数
// function get(key) {
//   return window.localStorage.getItem(key);
// }
// function set(key, value) {
//   window.localStorage.setItem(key, value);
// }
// function removeItem(key) {
//   window.localStorage.removeItem(key);
// }
// function clear() {
//   window.localStorage.clear();
// }

// 第二种：对象

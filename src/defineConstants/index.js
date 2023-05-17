function defineConstants(defs, options = {namespace: ""}) {
    // 前缀
    const prefix = options.namespace ? `${options.namespace}_` : "";
    // 返回
    return {
        [`${prefix}KEYS`]: defs.map(item => item.key),
        [`${prefix}VALUES`]: defs.map(item => item.value),
        [`${prefix}K_V`]: defs.reduce((map, item) => ({...map, [item.key]: item.value}), {}),
        [`${prefix}V_K`]: defs.reduce((map, item) => ({...map, [item.value]: item.key}), {}),
        [`${prefix}LIST`]: defs,
        [`${prefix}KEY_MAP`]: defs.reduce((map, item) => ({...map, [item.key]: item}), {}),
        [`${prefix}MAP_BY_VALUE`]: defs.reduce((map, item) => ({...map, [item.value]: item}), {}),
    }
}

const dic = defineConstants([{
    key: 'key', value: 1, name: 'Vue',
}, {
    key: 'key1', value: 2, name: 'React',
},]);

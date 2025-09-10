import { getMaterialValues } from './materials';
function ensureDurability(item) {
    if (!item?.isOfType?.('physical'))
        return;
    const updates = {};
    // Derive material-based defaults
    const materialType = item.system?.material?.type ?? null;
    const materialValues = getMaterialValues(materialType);
    const hp = item.system?.hp;
    if (!hp || hp.max == null) {
        updates['system.hp'] = {
            value: materialValues.hp,
            max: materialValues.hp,
            brokenThreshold: Math.floor(materialValues.hp / 2),
        };
    }
    if (item.system?.hardness == null) {
        updates['system.hardness'] = materialValues.hardness;
    }
    if (Object.keys(updates).length > 0) {
        item.update(updates);
    }
}
Hooks.once('ready', () => {
    console.log('PF2e Item Integrity module initialized.');
    for (const item of game.items.contents ?? []) {
        ensureDurability(item);
    }
    for (const actor of game.actors.contents ?? []) {
        for (const item of actor.items.contents ?? []) {
            ensureDurability(item);
        }
    }
});

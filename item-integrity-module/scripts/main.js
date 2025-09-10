import { getMaterialValues } from './materials';
import { ItemIntegritySheetPF2e } from './sheet';
export async function applyItemDamage(item, damage) {
    if (!item?.system?.hp)
        return;
    let rollTotal;
    if (typeof damage === 'string') {
        const roll = await new Roll(damage).roll({ async: true });
        rollTotal = roll.total;
    }
    else {
        rollTotal = damage;
    }
    const hardness = item.system.hardness ?? 0;
    const applied = Math.max(rollTotal - hardness, 0);
    const hp = item.system.hp;
    const newValue = Math.max(hp.value - applied, 0);
    const isDestroyed = newValue <= 0;
    const isBroken = !isDestroyed && newValue <= (hp.brokenThreshold ?? 0);
    await item.update({
        'system.hp.value': newValue,
        'flags.pf2e.broken': isBroken,
        'flags.pf2e.destroyed': isDestroyed,
    });
    await ChatMessage.create({
        content: `${item.name} takes ${applied} damage (Hardness ${hardness}).`,
    });
}
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
Hooks.once('init', () => {
    Items.registerSheet('pf2e', ItemIntegritySheetPF2e, {
        types: ['armor', 'consumable', 'equipment', 'treasure', 'weapon', 'backpack'],
        makeDefault: true,
    });
});
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

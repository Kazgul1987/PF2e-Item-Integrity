import { getMaterialValues } from "./materials.js";
import { ItemIntegritySheetPF2e } from "./sheet.js";
let pendingItemTarget = null;
export async function applyItemDamage(item, damage) {
    const hp = item.flags?.['pf2e-item-integrity']?.hp;
    if (!hp)
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
    const newValue = Math.max(hp.value - applied, 0);
    const isDestroyed = newValue <= 0;
    const isBroken = !isDestroyed && newValue <= (hp.brokenThreshold ?? 0);
    const wasBroken = item.flags?.pf2e?.broken;
    const wasDestroyed = item.flags?.pf2e?.destroyed;
    await item.update({
        'flags.pf2e-item-integrity.hp.value': newValue,
        'flags.pf2e.broken': isBroken,
        'flags.pf2e.destroyed': isDestroyed,
    });
    await ChatMessage.create({
        content: `${item.name} takes ${applied} damage (Hardness ${hardness}).`,
    });
    if (!wasDestroyed && isDestroyed) {
        ui.notifications?.error(`${item.name} is destroyed!`);
        await ChatMessage.create({ content: `${item.name} is destroyed!` });
    }
    else if (!wasBroken && isBroken) {
        ui.notifications?.warn(`${item.name} is broken!`);
        await ChatMessage.create({ content: `${item.name} is broken!` });
    }
}
export async function repairItem(item) {
    const hp = item.flags?.['pf2e-item-integrity']?.hp;
    if (!hp)
        return;
    await item.update({
        'flags.pf2e-item-integrity.hp.value': hp.max,
        'flags.pf2e.broken': false,
        'flags.pf2e.destroyed': false,
    });
    await ChatMessage.create({
        content: `${item.name} is fully repaired.`,
    });
}
function ensureDurability(item) {
    if (!item?.isOfType?.('physical'))
        return;
    const updates = {};
    // Derive material-based defaults
    const materialType = item.system?.material?.type ?? null;
    const materialValues = getMaterialValues(materialType);
    const hp = item.flags?.['pf2e-item-integrity']?.hp;
    if (!hp || hp.max == null) {
        updates['flags.pf2e-item-integrity.hp'] = {
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
Hooks.on('preItemRoll', (_item, _options) => {
    const targets = Array.from(game.user?.targets ?? []);
    const token = targets[0];
    const actor = token?.actor;
    const hasHp = actor?.flags?.['pf2e-item-integrity']?.hp;
    pendingItemTarget = hasHp ? actor : null;
});
Hooks.on('pf2e.damageApplied', async (...args) => {
    const damageData = args.find((a) => typeof a === 'object' && a?.total != null);
    const total = typeof damageData?.total === 'number' ? damageData.total : 0;
    if (pendingItemTarget) {
        await applyItemDamage(pendingItemTarget, total);
        pendingItemTarget = null;
    }
});
Hooks.on('getActorInventoryContext', (html, options) => {
    options.push({
        name: 'Item Damage',
        icon: '<i class="fa-solid fa-burst"></i>',
        callback: (li) => {
            const actor = game.actors.get(html.closest('.app').data('actorId'));
            const item = actor.items.get(li.data('item-id'));
            new Dialog({
                title: 'Item Damage',
                content: '<div class="form-group"><label>Damage</label><input type="text" name="damage" autofocus /></div>',
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Apply',
                        callback: (dialogHtml) => {
                            const dmg = dialogHtml.find('input[name="damage"]').val();
                            applyItemDamage(item, dmg);
                        },
                    },
                    cancel: { label: 'Cancel' },
                },
                default: 'ok',
            }).render(true);
        },
    });
    options.push({
        name: 'Repair Item',
        icon: '<i class="fa-solid fa-hammer"></i>',
        callback: (li) => {
            const actor = game.actors.get(html.closest('.app').data('actorId'));
            const item = actor.items.get(li.data('item-id'));
            new Dialog({
                title: 'Repair Item',
                content: `<p>Repair ${item.name} to full HP?</p>`,
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Repair',
                        callback: () => repairItem(item),
                    },
                    cancel: { label: 'Cancel' },
                },
                default: 'ok',
            }).render(true);
        },
    });
});

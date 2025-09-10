export class ItemIntegritySheetPF2e extends PhysicalItemSheetPF2e {
    get template() {
        return super.template;
    }
    async getData(options = {}) {
        const data = await super.getData(options);
        data.isBroken = this.item.isBroken ?? false;
        data.isDestroyed = this.item.isDestroyed ?? false;
        return data;
    }
    async _renderInner(data, options) {
        const html = await super._renderInner(data, options);
        const inner = await renderTemplate('modules/pf2e-item-integrity/templates/integrity.hbs', data);
        const element = html instanceof HTMLElement ? html : html[0];
        element.querySelector('.sheet-content')?.insertAdjacentHTML('beforeend', inner);
        return html;
    }
}

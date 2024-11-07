"use strict";

const getSyncStorage = (key = null) => new Promise(resolve => {
    chrome.storage.sync.get(key, resolve);
});

const setSyncStorage = (key = null) => new Promise(resolve => {
    chrome.storage.sync.set(key, resolve);
});

const operateStorage = (key = null, storageKey = "sync", operate = "get") => new Promise(resolve => {
    chrome.storage[storageKey][operate](key, resolve);
});

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const obtainMessage_hours = (hours_info, year, month) => {
    let content = `    ${year}-${month}\n`;
    content += "---------\n";
    let sum_hours = 0;
    for (const charge_id of Object.keys(hours_info)) {
        content += `${charge_id}: ${hours_info[charge_id].sum} hours\n`;
        sum_hours += hours_info[charge_id].sum;
    }
    content += "---------\n";
    content += `Total: ${sum_hours} hours\n`;
    content += "    See Developer Console";
    return content;
}
class HourCollector {
    constructor(year, month, replicon_domain, group_id) {
        this.year = year;
        this.month = month;
        this.replicon_domain = replicon_domain;
        this.group_id = group_id;
        this.hours_info = {};
        this.dic_hours = {};
    }

    async collectHours() {
        const days = [1, 8, 15, 22, 29];
        for (const day of days) {
            await this._obtainHoursFromReplicon(day);
        }
        let hours_info = {};
        const year_month = `${this.year}-${this.month}`;
        for (const charge_id of Object.keys(this.dic_hours).sort()) {
            if (!hours_info[charge_id]) hours_info[charge_id] = {};
            hours_info[charge_id].days=this.dic_hours[charge_id]
        }
        for (const charge_id of Object.keys(hours_info)) {
            hours_info[charge_id].sum = Object.values(hours_info[charge_id].days).reduce((a, b) => a + b, 0);
        }
        this.hours_info = hours_info;
    }

    async _obtainHoursFromReplicon(day) {
        if (new Date(this.year, this.month - 1, day).getMonth() !== this.month - 1) return null;
        const url = `https://${this.replicon_domain}/${this.group_id}/my/timesheet/${this.year}-${this.month}-${day}`;

        return new Promise((resolve, reject) => {
            const date_key = new Date(this.year, this.month - 1, day + 1).toISOString().split("T")[0];
            const popup = window.open(url, date_key, "width=10, height=10");

            const interval = setInterval(() => {
                const table = popup.document.querySelector("ul.widgetList>li>div>div>table");
                if (!table) return;
                clearInterval(interval);
                const dic_hours_week = this._obtainHours(table, day);
                for (const charge_id in dic_hours_week) {
                    if (!this.dic_hours[charge_id]) this.dic_hours[charge_id] = {};
                    this.dic_hours[charge_id] = Object.assign(dic_hours_week[charge_id], this.dic_hours[charge_id]);
                }
                popup.close();
                resolve();
            }, 500);

            popup.onerror = reject;
        });
    }

    _obtainHours = (table, day) => {
        const year = this.year;
        const month = this.month;

        const en_month = new Intl.DateTimeFormat("en-US", { month: "long" }
        ).format(new Date(year, month - 1, 1));
        const th_days = Array.from(table.querySelectorAll("thead>tr:first-child>th.day"));
        const valid_day_doms = th_days.map((d, ind) => [d, ind]
        ).filter(([d, ind]) => d.getAttribute("titlehtml").indexOf(en_month) !== -1
        );
        const valid_day_inds = valid_day_doms.map(([d, ind]) => ind);
        const valid_days = valid_day_doms.map(([d,ind])=>d.getAttribute("titlehtml").split(en_month)[0].replace(/[^0-9]/g, ""));

        let dic_hours_week = {}
        const spans = Array.from(table.querySelectorAll("tbody")[0].querySelectorAll("tr>td:first-child>span:first-child"));
        for (const span of spans) {
            const div_full = span.querySelector("div.fullLength:nth-child(2)");
            const charge_id = (!div_full) ? null : div_full.innerText;
            const tr = span.closest("tr");
            const td_days = Array.from(tr.querySelectorAll("td.day")).filter((d, ind) => valid_day_inds.includes(ind));
            const hours = td_days.map(d => Number(d.querySelector("span.text") && d.querySelector("span.text").innerText));
            dic_hours_week[charge_id] = Object.fromEntries(valid_days.map((d, ind) => [d, hours[ind]]));
        }
        return dic_hours_week;
    }
}
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

const obtainMessage_hours = (sum_hours, date_start, date_end) => {
    let content = `    ${date_start} _ ${date_end}\n`;
    content += "---------\n";
    let sum_hour = 0;
    for (const charge_id of Object.keys(sum_hours)) {
        content += `${charge_id}: ${sum_hours[charge_id]} hours\n`;
        sum_hour += sum_hours[charge_id];
    }
    content += "---------\n";
    content += `Total: ${sum_hour} hours\n`;
    content += "    See Developer Console";
    return content;
}

const sumHours = (hours_infos, date_start, date_end) => {
    let sum_hours = {};
    for (const year_month of Object.keys(hours_infos)) {
        const hours_info = hours_infos[year_month];

        for (const charge_id of Object.keys(hours_info)) {
            for (const day of Object.keys(hours_info[charge_id].days)) {
                const date_tmp_str = `${year_month}-${day}`;
                const date_tmp = new Date(date_tmp_str);
                if (date_tmp < new Date(date_start) || date_tmp > new Date(date_end)) {
                    continue;
                }
                if (!sum_hours[charge_id]) sum_hours[charge_id] = 0;
                sum_hours[charge_id] += hours_info[charge_id].days[day];

            }
            // hours_info[charge_id].sum = Object.values(hours_info[charge_id].days).reduce((a, b) => a + b, 0);
        }
    }        
    return sum_hours;
}
class HourCollector {
    constructor(date_start, date_end, replicon_domain, group_id) {
        this.date_start = date_start;
        this.date_end = date_end;
        this.replicon_domain = replicon_domain;
        this.group_id = group_id;
        this.hours_infos = {};
        this.dic_hours = {};
    }

    async _collectHours() {
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
        // for (const charge_id of Object.keys(hours_info)) {
        //     hours_info[charge_id].sum = Object.values(hours_info[charge_id].days).reduce((a, b) => a + b, 0);
        // }
        this.hours_infos[year_month] = hours_info;
    }

    async collectHours(){
        const date_start = new Date(this.date_start);
        const date_end = new Date(this.date_end);
        this.year = date_start.getFullYear();
        this.month = date_start.getMonth() + 1;
        while (date_start < date_end) {
            await this._collectHours();
            date_start.setMonth(date_start.getMonth() + 1);
            this.year = date_start.getFullYear();
            this.month = date_start.getMonth() + 1;
        }
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
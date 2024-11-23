import { InlineKeyboard } from "grammy";
export function generateDateTimeSelector(year, month, state, hour) {
    const keyboard = new InlineKeyboard();
    if (state === "date") {
        // Генерация календаря для выбора даты
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        // Заголовок с месяцем и годом
        keyboard.text(`${new Date(year, month).toLocaleString("ru", {
            month: "long",
        })} ${year}`, "ignore");
        keyboard.row();
        // Дни недели
        const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
        weekDays.forEach((day) => keyboard.text(day, "ignore"));
        keyboard.row();
        // Пустые кнопки до начала месяца
        for (let i = 0; i < (firstDay + 6) % 7; i++) {
            keyboard.text(" ", "ignore");
        }
        // Дни месяца
        for (let day = 1; day <= daysInMonth; day++) {
            keyboard.text(day.toString().padStart(2, "0"), `date:${year}-${(month + 1).toString().padStart(2, "0")}-${day
                .toString()
                .padStart(2, "0")}`);
            if ((firstDay + day) % 7 === 0) {
                keyboard.row();
            }
        }
        // Навигация
        keyboard.row();
        const prevMonth = new Date(year, month - 1);
        const nextMonth = new Date(year, month + 1);
        keyboard
            .text("⬅️", `change_month:${prevMonth.getFullYear()}-${prevMonth
            .getMonth()
            .toString()
            .padStart(2, "0")}`)
            .text("➡️", `change_month:${nextMonth.getFullYear()}-${nextMonth
            .getMonth()
            .toString()
            .padStart(2, "0")}`);
    }
    else if (state === "hour") {
        // Генерация клавиатуры для выбора часа
        for (let i = 0; i < 24; i++) {
            keyboard.text(i.toString().padStart(2, "0"), `hour:${i}`).row();
        }
    }
    else if (state === "minute") {
        // Генерация клавиатуры для выбора минут
        for (let i = 0; i < 60; i += 5) {
            keyboard.text(i.toString().padStart(2, "0"), `minute:${i}`).row();
        }
    }
    // Добавляем кнопку "Отмена" в каждом состоянии
    keyboard.row().text("Отмена", "cancel");
    return keyboard;
}

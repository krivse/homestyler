export function validate(text) {
    let ans;
    try {
        ans = text.split(" ")
    } catch {
        return [1, "Неверный синтаксис"]
    }
    if (ans.length >= 3) {
        let x = ans[0]
        if (!Number.isInteger(Number(x))) {
            return [400, '"X" должно быть числом']
        }
        let y = ans[1]
        if (!Number.isInteger(Number(y))) {
            return [400, '"Y" должно быть числом']
        }
        let name = ans.splice(2).join(' ').trim()
        return [200, x, y, name]
    } else {
        return [400, "Передано неверное количество аргументов"]
    }
}
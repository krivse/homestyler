export function validate(text) {
    let ans;
    try {
        ans = text.split(" ")
    } catch {
        return [1, "Неверный синтаксис"]
    }
    if (ans.length >= 2) {
        let num = ans[0]
        if (!Number.isInteger(Number(num))) {
            return [400, 'Первый аргумент должен быть числом']
        }
        let name = ans.splice(1).join(' ').trim()
        return [200, num, name]
    } else {
        return [400, "Передано неверное количество аргументов"]
    }
}

export function validate_json(data) {
    let id = data['id']
    let name = data['name']

    if (id === undefined || name === undefined) {
        return [400, "Передано неверное количество аргументов"]
    } else if (!Number.isInteger(Number(id))) {
        return [400, 'Первый аргумент должен быть числом']
    } else {
        return [200, id, name]
    }
}
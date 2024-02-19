const { createServer } = require("./WSNET_Framework/_server/index.js");
const { randomBytes } = require("crypto");
const { log } = require("console");
const fs = require("fs");
const port = 8080;

const sockets = new Map()

createServer({ port }, async client => {
    //create the user and aut value
    var user = false;
    //create seccion id
    var id = randomBytes(10).toString("base64url")
    //on auth
    client.onGet("auth", data => {
        //check if the user is auth
        if (auth(data)) {
            //set the user to the sended username
            if (!user) {
                user = data.u
                if (!sockets?.[user]) {
                    sockets[user] = { [id]: client }
                }
                else {
                    sockets[user][id] = client
                }
            }
            //return sucsess
            return true;
        }
        //return error
        else return false;
    });
    //on create user
    client.onGet("create_new_user", name => {
        if (!user) return createUser(name + "")
        else return false
    });
    //to send messages
    client.onSay("send-message", msg => {
        if (!user) return
        sendMessage(user, msg)
    })
    //to create a new room
    client.onSay()

})

//to send messages
function sendMessage(user, msg) {
    //check the params
    if (typeof msg != "object") return
    if (!msg.room) return
    //create the room path
    var roomPath = `data/rooms/${msg.room + ""}`
    //check if the room exist
    if (!fs.existsSync(roomPath)) return
    //ckeck if the user is in the room
    var usersInRoom = JSON.parse(fs.readFileSync(`${roomPath}/user.txt`, "utf-8"))
    if (!usersInRoom.includes(user)) return
    //create the data
    var data = {
        form: user,
        id: randomBytes(10).toString("base64url"),
        data: msg?.data + "" || "",
        type: msg?.type + "" || "text",
        date: new Date().toLocaleString(),
        react: msg?.reaction + "" == "none" ? false : msg?.reaction + "",
        comments: {},
    }
    log(data)
    //send message to all user in room
    usersInRoom.forEach(userInRoom => {
        if (sockets?.[userInRoom]) {
            //check if the user isnt the sender
            if (userInRoom != user)
                for (var client in sockets[userInRoom]) {
                    //send
                    client?.say?.("incomming-message", data)
                }
        }
    });
    //store the messages
    //push the message
    var messages = JSON.parse(fs.readFileSync(`${roomPath}/messages.txt`, "utf-8"))
    messages.push(data.id);
    fs.writeFileSync(`${roomPath}/messages.txt`, JSON.stringify(messages), "utf-8")
    //store the message
    fs.writeFileSync(`${roomPath}/message-data/${data.id}.txt`, JSON.stringify(data), "utf-8")
}

function createRoom(usersInRoom = []) {
    //check if all user exist
    if (
        usersInRoom
            .map(userID => fs.existsSync(`data/user/${securifyPath(userID)}.txt`))
            .includes(false)
    ) return false
    //create the id
    var id = randomBytes(30).toString("base64url")
    //create the room path
    var roomPath = `data/rooms/${id}`
    //check if the room exist
    if (fs.existsSync(roomPath)) return false
    //create the files and folders
    fs.mkdirSync(`${roomPath}/message-data/`, { recursive: true })
    fs.writeFileSync(`${roomPath}/user.txt`, JSON.stringify(usersInRoom), "utf-8")
    fs.writeFileSync(`${roomPath}/messages.txt`, "[]", "utf-8")
    return id;
}

//menage authentication
function auth(data) {
    //check if the user and password is set
    if (!data?.u || !data?.p) return false;
    //create the file path
    const userPath = `data/user/${securifyPath(data.u)}.txt`
    //check if the user exists
    if (!fs.existsSync(userPath)) return false;
    //get the password from the user-file
    const password = fs.readFileSync(userPath, "utf-8");
    //return the user-password is equalt to the sended password
    return password == (data?.p + "");

}
//create user
function createUser(name) {
    //create random userdata
    const userData = {
        u: securifyPath(randomBytes(20).toString("base64url")),
        p: randomBytes(40).toString("base64url")
    }
    //create the userfile path
    const userPath = `data/user/${userData.u}.txt`
    //check if the user not exists
    if (fs.existsSync(userPath)) return false;
    //store the password
    fs.writeFileSync(userPath, userData.p, "utf-8");
    //create an new user dir
    fs.mkdirSync(`data/user-data/${userData.u}`, { recursive: true })
    //store the name
    fs.writeFileSync(`data/user-data/${userData.u}/name.txt`, name + "", "utf-8");

    return userData;

}
//securify paths
function securifyPath(str) {
    return (str + "").split("/").join("_").split(".").join("_");
}

process.on("uncaughtException", err => log(err))
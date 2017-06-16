package com.example.alex.myapplication;

import com.github.nkzawa.socketio.client.IO;
import com.github.nkzawa.socketio.client.Socket;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

public class ServerCommunication {

    private static ServerCommunication serverComm;
    private Socket socket;

    private ServerCommunication() {
        try {
            socket = IO.socket("http://192.168.0.113:3000");
        } catch (URISyntaxException e) {}
    }

    public static ServerCommunication getInstance () {
        if(serverComm == null) {
            return new ServerCommunication();
        }
        else{
            return serverComm;
        }
    }

    public void sendEvent(String message, HashMap<String,Object> args) {
        JSONObject data = new JSONObject();
        JSONObject argumentsToProvide = new JSONObject();

        try {
            data.put("type", message);
            data.put("args", argumentsToProvide);
            for(Map.Entry<String, Object> entry : args.entrySet())
                    argumentsToProvide.put(entry.getKey(), entry.getValue());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        socket.connect();
        socket.emit("event", data);
    }
}
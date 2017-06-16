package com.example.alex.myapplication;

import android.content.Context;
import android.widget.Toast;

import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.Volley;
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

    public void sendEvent(String message, Map<String,Object> args) {
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

    public void request(final Context context, Map<String,Object> args, final DataCallBack dataCallBack) {
        RequestQueue queue = Volley.newRequestQueue(context);
        String url = (String)args.get("url");
        JsonArrayRequest jsObjRequest = new JsonArrayRequest(url, new Response.Listener<JSONArray>() {
            @Override
            public void onResponse(JSONArray response) {
                Toast.makeText(context, response.toString(), Toast.LENGTH_SHORT).show();
                dataCallBack.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Toast.makeText(context, "ServerComm Error!", Toast.LENGTH_SHORT).show();
                dataCallBack.onFailure();
            }
        });
        queue.add(jsObjRequest);
    }
}
package com.example.alex.myapplication.parsers;


import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.models.Biot;

import org.json.JSONException;
import org.json.JSONObject;

public class AlertParser implements BiotEntityParser {
    @Override
    public Biot parse(JSONObject data) throws JSONException {
        String message = (String)data.get("message");
        Biot biot = new Alert(message);
        return biot;
    }
}

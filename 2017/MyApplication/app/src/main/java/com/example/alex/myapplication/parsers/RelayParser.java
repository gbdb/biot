package com.example.alex.myapplication.parsers;

import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.models.Relay;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;


public class RelayParser implements BiotEntityParser {
    @Override
    public Biot parse(JSONObject data) {
        Biot biot = null;
        try {
            String name = (String)data.get("name");
            String _id = (String)data.get("_id");
            boolean status = (boolean)data.get("status");
            biot = new Relay(name,_id,status);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return biot;
    }

    @Override
    public JSONObject parse(Biot data) {
        return null;
    }
}
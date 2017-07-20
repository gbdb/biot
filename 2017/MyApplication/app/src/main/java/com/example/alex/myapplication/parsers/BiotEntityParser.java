package com.example.alex.myapplication.parsers;

import com.example.alex.myapplication.models.Biot;

import org.json.JSONException;
import org.json.JSONObject;

public interface BiotEntityParser {
    Biot parse(JSONObject data) throws JSONException;
    JSONObject parse(Biot data) throws JSONException;
}

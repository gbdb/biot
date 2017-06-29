package com.example.alex.myapplication.communication;

import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

public interface Operation {
    void fetchAll(BiotDataCallback biotDataCallback, BiotEntityParser parser);
    boolean insert(Biot biot);
}

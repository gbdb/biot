package com.example.alex.myapplication.communication;
import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

public interface Operation {
    void fetchAll(BiotDataCallback biotDataCallback, BiotEntityParser parser);
    boolean create(Biot biot);
    void update(Biot biot, BiotEntityParser parser, BiotDataCallback biotDataCallback);
}

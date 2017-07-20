package com.example.alex.myapplication.communication;
import com.example.alex.myapplication.models.Biot;

public interface Operation {
    void fetchAll(BiotDataCallback biotDataCallback);
    boolean create(Biot biot);
    void update(Biot biot, BiotDataCallback biotDataCallback);
}

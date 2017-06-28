package com.example.alex.myapplication.communication;

import com.example.alex.myapplication.models.Biot;
import com.example.alex.myapplication.parsers.BiotEntityParser;

/**
 * Created by alex on 6/27/17.
 */

public interface Operation {
    void fetchAll(BiotDataCallback biotDataCallback, BiotEntityParser parser);
    boolean insert(Biot biot);
}

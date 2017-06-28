package com.example.alex.myapplication.communication;

import com.example.alex.myapplication.models.IOEnty;

import java.util.List;

/**
 * Created by alex on 6/27/17.
 */

public interface Operation {
    void fetchAll();
    boolean add(IOEnty ioEnty);
}

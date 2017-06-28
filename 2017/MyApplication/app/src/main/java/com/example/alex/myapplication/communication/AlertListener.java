package com.example.alex.myapplication.communication;

import com.example.alex.myapplication.models.Alert;

public interface AlertListener {
    void onNewAlert(Alert alert);
}

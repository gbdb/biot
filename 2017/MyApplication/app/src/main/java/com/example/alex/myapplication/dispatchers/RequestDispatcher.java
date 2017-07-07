package com.example.alex.myapplication.dispatchers;


public class RequestDispatcher {

    private static RequestDispatcher requestDispatcher;

    private RequestDispatcher() {}

    public static RequestDispatcher getInstance() {
        if(requestDispatcher == null) {
            requestDispatcher = new RequestDispatcher();
            return requestDispatcher;
        }
        else
            return requestDispatcher;
    }
}
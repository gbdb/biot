package com.example.alex.timerdepompe;

import android.app.AlertDialog;
import android.app.Dialog;
import android.app.DialogFragment;
import android.content.DialogInterface;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

public class FireHackDialog extends DialogFragment {

    private DataCallBack dataCallBack;
    private EditText textView;
    private EditText textView1;
    private Button button;

    public FireHackDialog() {}

    public void setDataCallBack(DataCallBack dataCallBack) {this.dataCallBack = dataCallBack;}

    private Button hackyDialogButton;
    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        LayoutInflater inflater = getActivity().getLayoutInflater();

        View view = inflater.inflate(R.layout.dialog_hack, null);

        Log.i("BURP", view.findViewById(R.id.button2).toString());
        button = (Button)view.findViewById(R.id.button2);
        textView = (EditText)view.findViewById(R.id.tempsOff);
        textView1 = (EditText)view.findViewById(R.id.tempsOn);


        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String toSend = textView1.getText().toString() + "," +
                        textView.getText().toString();
                dataCallBack.onSuccess(toSend);
            }
        });

        builder.setView(view);
        return builder.create();
    }
}